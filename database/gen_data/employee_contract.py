"""Tạo hợp đồng đầy đủ và upload một PDF thật riêng cho từng nhân viên dataset."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from asset_storage import get_storage
from assets import CONTRACT_ASSET, validate_assets
from identity_dataset import PEOPLE
from snowflake_id import snowflake


def get_admin_id(cursor) -> int:
    """Lấy admin user ID để ghi audit hợp đồng và file metadata."""
    cursor.execute("SELECT id FROM user WHERE username='admin.report'")
    row = cursor.fetchone()
    if not row:
        raise ValueError("Thiếu admin.report trước khi seed employee_contract")
    return row["id"]


def get_employees(cursor) -> dict[str, dict]:
    """Lấy đúng 50 employee cùng mã nhân viên và role chính."""
    usernames = tuple(person["username"] for person in PEOPLE if person["role"] != "STUDENT")
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(
        f"""
        SELECT u.id, u.username, e.employee_code, e.employment_type, e.status
        FROM user u
        JOIN employee e ON e.user_id=u.id
        WHERE u.username IN ({placeholders})
        """,
        usernames,
    )
    employees = {row["username"]: row for row in cursor.fetchall()}
    if len(employees) != 50:
        raise ValueError(f"Cần đủ 50 employees trước khi seed hợp đồng, hiện có {len(employees)}")
    return employees


def contract_terms(person: dict, employee: dict) -> dict:
    """Xác định loại hợp đồng, kỳ hạn và lương nhất quán với role nhân viên."""
    role = person["role"]
    ordinal = person["ordinal"]
    if employee["status"] == "PROBATION":
        contract_type = "PROBATION"
        start_date = date(2026, 7, 1 + ordinal % 10)
        end_date = start_date + timedelta(days=60)
    elif role in {"ADMIN", "HR", "SUPPORT"}:
        contract_type = "INDEFINITE"
        start_date = date(2024, 1 + ordinal % 6, 1 + ordinal % 20)
        end_date = None
    elif role == "TEACHER":
        contract_type = "FIXED_TERM"
        start_date = date(2025, 1 + ordinal % 6, 1 + ordinal % 20)
        end_date = date(2027, start_date.month, start_date.day)
    else:
        contract_type = "SEASONAL"
        start_date = date(2026, 1 + ordinal % 6, 1 + ordinal % 20)
        end_date = date(2027, start_date.month, start_date.day)

    if employee["employment_type"] == "PART_TIME":
        salary_type = "HOURLY"
        base_salary = Decimal(180000 + ordinal * 5000)
    else:
        salary_type = "MONTHLY"
        base_by_role = {"ADMIN": 45000000, "HR": 18000000, "SUPPORT": 15000000, "TEACHER": 24000000}
        base_salary = Decimal(base_by_role[role] + ordinal * 350000)

    return {
        "contract_type": contract_type,
        "start_date": start_date,
        "end_date": end_date,
        "base_salary": base_salary,
        "salary_type": salary_type,
        "status": "ACTIVE",
        "signing_status": "FULLY_SIGNED",
        "signed_at": datetime.combine(start_date - timedelta(days=3), datetime.min.time()).replace(hour=9),
    }


def resolve_contract_id(cursor, employee_id: int) -> tuple[int, bool]:
    """Tái sử dụng hợp đồng mới nhất của employee hoặc cấp Snowflake ID mới."""
    cursor.execute(
        "SELECT id FROM employee_contract WHERE employee_id=%s ORDER BY created_at DESC, id DESC LIMIT 1",
        (employee_id,),
    )
    existing = cursor.fetchone()
    return (existing["id"], False) if existing else (snowflake.next_id(), True)


def contract_file_key(contract_id: int) -> str:
    """Sinh object key ổn định theo quy ước contracts/contract_ID_UUID.pdf của backend."""
    object_uuid = uuid5(NAMESPACE_URL, f"ailms:employee-contract:{contract_id}")
    return f"contracts/contract_{contract_id}_{object_uuid}.pdf"


def synchronize_metadata(
    cursor,
    contract_id: int,
    employee_code: str,
    file_key: str,
    admin_id: int,
    timestamp: datetime,
) -> tuple[int, bool]:
    """Upsert metadata DOCUMENT/CONTRACT và trả metadata ID thật."""
    source = CONTRACT_ASSET["source"]
    cursor.execute("SELECT id FROM file_metadata WHERE file_key=%s", (file_key,))
    existing = cursor.fetchone()
    original_name = f"Hop_Dong_Lao_Dong_{employee_code}.pdf"
    if existing:
        cursor.execute(
            """
            UPDATE file_metadata
            SET original_name=%s, file_size=%s, content_type='application/pdf',
                file_type='DOCUMENT', status='ACTIVE', usage_type='CONTRACT',
                reference_entity_id=%s, reference_entity_type='EmployeeContract',
                orphaned_detected_at=NULL, updated_by=%s, updated_at=%s
            WHERE id=%s
            """,
            (original_name, source.stat().st_size, contract_id, admin_id, timestamp, existing["id"]),
        )
        return existing["id"], False

    metadata_id = snowflake.next_id()
    cursor.execute(
        """
        INSERT INTO file_metadata (
            id, file_key, original_name, file_size, content_type, file_type,
            status, usage_type, reference_entity_id, reference_entity_type,
            orphaned_detected_at, created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, 'application/pdf', 'DOCUMENT', 'ACTIVE',
                  'CONTRACT', %s, 'EmployeeContract', NULL, %s, NULL, %s, %s)
        """,
        (
            metadata_id,
            file_key,
            original_name,
            source.stat().st_size,
            contract_id,
            admin_id,
            timestamp,
            timestamp,
        ),
    )
    return metadata_id, True


def synchronize_contract(
    cursor,
    contract_id: int,
    is_new: bool,
    employee_id: int,
    metadata_id: int,
    file_key: str,
    terms: dict,
    admin_id: int,
) -> None:
    """Tạo hoặc cập nhật hợp đồng hiện hành và liên kết metadata mới nhất."""
    timestamp = terms["signed_at"]
    values = (
        employee_id,
        terms["contract_type"],
        terms["start_date"],
        terms["end_date"],
        terms["base_salary"],
        terms["salary_type"],
        file_key,
        metadata_id,
        terms["status"],
        terms["signing_status"],
        terms["signed_at"],
    )
    if is_new:
        cursor.execute(
            """
            INSERT INTO employee_contract (
                id, employee_id, contract_type, start_date, end_date, base_salary,
                salary_type, file_key, file_metadata_id, original_file_metadata_id,
                status, signing_status, signing_token, signing_token_expires_at,
                signed_at, terminated_at, termination_reason,
                created_by, updated_by, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s,
                      NULL, NULL, %s, NULL, NULL, %s, NULL, %s, %s)
            """,
            (contract_id, *values, admin_id, timestamp, timestamp),
        )
        return

    cursor.execute(
        """
        UPDATE employee_contract
        SET employee_id=%s, contract_type=%s, start_date=%s, end_date=%s,
            base_salary=%s, salary_type=%s, file_key=%s, file_metadata_id=%s,
            original_file_metadata_id=NULL, status=%s, signing_status=%s,
            signing_token=NULL, signing_token_expires_at=NULL, signed_at=%s,
            terminated_at=NULL, termination_reason=NULL, updated_by=%s, updated_at=%s
        WHERE id=%s
        """,
        (*values, admin_id, timestamp, contract_id),
    )


def seed(cursor) -> None:
    """Tạo 50 hợp đồng có file PDF thật, metadata riêng và trạng thái ký hoàn tất."""
    print("→ Uploading and seeding final-report employee contracts...")
    validate_assets()
    admin_id = get_admin_id(cursor)
    employees = get_employees(cursor)
    storage = get_storage()
    source = CONTRACT_ASSET["source"]
    uploaded = 0
    contracts_inserted = 0
    metadata_inserted = 0

    for person in (item for item in PEOPLE if item["role"] != "STUDENT"):
        employee = employees[person["username"]]
        terms = contract_terms(person, employee)
        contract_id, is_new = resolve_contract_id(cursor, employee["id"])
        file_key = contract_file_key(contract_id)
        uploaded += int(storage.upload_if_absent(source, file_key, CONTRACT_ASSET["content_type"]))
        storage.verify(file_key, source.stat().st_size)
        metadata_id, is_metadata_new = synchronize_metadata(
            cursor,
            contract_id,
            employee["employee_code"],
            file_key,
            admin_id,
            terms["signed_at"],
        )
        synchronize_contract(
            cursor,
            contract_id,
            is_new,
            employee["id"],
            metadata_id,
            file_key,
            terms,
            admin_id,
        )
        contracts_inserted += int(is_new)
        metadata_inserted += int(is_metadata_new)

    print(
        f"   [completed] contracts: inserted={contracts_inserted}, synchronized={50 - contracts_inserted}, "
        f"uploaded={uploaded}, reused={50 - uploaded}, metadata_inserted={metadata_inserted}"
    )
