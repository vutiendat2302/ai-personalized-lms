"""
employee_contract.py
---------------------------
Seed dữ liệu cho bảng `employee_contract`.
- Lấy trực tiếp user_id từ bảng `employee` (chữa lỗi Foreign Key 1452).
- Xử lý ràng buộc @OneToOne: Mỗi file_metadata chỉ được dùng cho 1 hợp đồng (chữa lỗi 1062 Duplicate Entry).
- Loại trừ ADMIN và STUDENT.
- Tỉ lệ hợp đồng: 60% OFFICIAL, 30% SEASONAL, 10% PROBATION.
- Tỉ lệ lương: 80% DAILY, 10% MONTHLY, 10% HOURLY.
- Status 100% ACTIVE.
- Bổ sung created_by (ID Admin), updated_by (NULL), created_at, updated_at.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------


def get_admin_id(cursor):
    """Lấy ID của Admin để gán vào created_by."""
    query = """
        SELECT u.id 
        FROM user u
        JOIN user_role ur ON u.id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code = 'ADMIN'
        LIMIT 1
    """
    cursor.execute(query)
    row = cursor.fetchone()
    return row["id"] if row else None


def get_eligible_employees(cursor):
    """
    Lấy danh sách user_id TRỰC TIẾP từ bảng `employee`, 
    đồng thời lọc bỏ những ai có role ADMIN hoặc STUDENT.
    """
    query = """
        SELECT DISTINCT e.user_id as id 
        FROM employee e
        JOIN user_role ur ON e.user_id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code NOT IN ('ADMIN', 'STUDENT')
    """
    try:
        cursor.execute(query)
        return sorted([row["id"] for row in cursor.fetchall()])
    except Exception:
        cursor.execute("SELECT user_id as id FROM employee")
        return sorted([row["id"] for row in cursor.fetchall()])


def get_available_file_metadata(cursor):
    """
    ---> ĐÃ SỬA: Chỉ lấy những file CHƯA ĐƯỢC DÙNG trong employee_contract <---
    Giải quyết triệt để lỗi 1062 do ràng buộc @OneToOne (1 file - 1 hợp đồng).
    """
    query = """
        SELECT fm.id, fm.file_key 
        FROM file_metadata fm
        LEFT JOIN employee_contract ec ON fm.id = ec.file_metadata_id
        WHERE ec.file_metadata_id IS NULL
    """
    cursor.execute(query)
    return cursor.fetchall()


def check_contract_exists(cursor, employee_id: int):
    """Kiểm tra xem nhân viên này đã có hợp đồng chưa (Idempotent)."""
    cursor.execute(
        "SELECT id FROM employee_contract WHERE employee_id = %s", (employee_id,)
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    print("→ Seeding employee_contracts...")

    # 1. Lấy ID Admin
    admin_id = get_admin_id(cursor)
    if not admin_id:
        print("   [warning] Không tìm thấy user ADMIN! Tạm để NULL cho created_by.")
        admin_id = None

    # 2. Lấy danh sách nhân viên từ bảng employee
    employees = get_eligible_employees(cursor)
    if not employees:
        print("   [warning] Bảng `employee` trống hoặc không có nhân viên hợp lệ! Hãy chạy seed_employees trước.")
        return

    # 3. Lấy danh sách file metadata CÒN TRỐNG (chưa ai xài)
    available_files = list(get_available_file_metadata(cursor))
    random.shuffle(available_files)  # Xáo trộn để chia ngẫu nhiên

    total_emp = len(employees)

    # 4. Phân bổ Contract Type: 60% OFFICIAL, 30% SEASONAL, 10% PROBATION
    official_count = int(total_emp * 0.60)
    seasonal_count = int(total_emp * 0.30)
    probation_count = total_emp - (official_count + seasonal_count)

    contract_types = (
        ["OFFICIAL"] * official_count
        + ["SEASONAL"] * seasonal_count
        + ["PROBATION"] * probation_count
    )
    random.shuffle(contract_types)

    # 5. Phân bổ Salary Type: 80% DAILY, 10% MONTHLY, 10% HOURLY
    daily_count = int(total_emp * 0.80)
    monthly_count = int(total_emp * 0.10)
    hourly_count = total_emp - (daily_count + monthly_count)

    salary_types = (
        ["DAILY"] * daily_count
        + ["MONTHLY"] * monthly_count
        + ["HOURLY"] * hourly_count
    )
    random.shuffle(salary_types)

    # 6. Lặp qua danh sách nhân viên và tạo hợp đồng
    for idx, emp_id in enumerate(employees):
        # Check idempotent
        existing_id = check_contract_exists(cursor, emp_id)
        if existing_id:
            print(f"   [skip] Nhân viên ID {emp_id} đã có hợp đồng (id={existing_id})")
            continue

        c_type = contract_types[idx]
        s_type = salary_types[idx]

        # Xử lý ngày ký và ngày hiệu lực
        days_ago = random.randint(30, 700)
        signed_at = datetime.now() - timedelta(days=days_ago)
        start_date = signed_at.date() + timedelta(days=3)

        # Xử lý ngày hết hạn theo loại hợp đồng
        if c_type == "OFFICIAL":
            end_date = start_date + timedelta(days=365 * 3)  # 3 năm
        elif c_type == "SEASONAL":
            end_date = start_date + timedelta(days=180)      # 6 tháng
        else:  # PROBATION
            end_date = start_date + timedelta(days=60)       # 2 tháng

        # Xử lý mức lương logic theo hình thức
        if s_type == "HOURLY":
            base_salary = Decimal(random.randint(50, 200)) * Decimal(1000)
        elif s_type == "DAILY":
            base_salary = Decimal(random.randint(300, 1000)) * Decimal(1000)
        else:  # MONTHLY
            base_salary = Decimal(random.randint(8, 30)) * Decimal(1000000)

        # ---> XỬ LÝ GHÉP FILE CHUẨN ONETOONE <---
        # Bốc 1 file ra dùng và xóa khỏi mảng. Nếu hết file thì để NULL.
        if available_files:
            random_file = available_files.pop()
            file_metadata_id = random_file["id"]
            file_key = random_file["file_key"]
        else:
            file_metadata_id = None
            file_key = None

        new_id = snowflake.next_id()

        # Insert với đầy đủ 15 cột
        cursor.execute(
            """
            INSERT INTO employee_contract (
                id, employee_id, contract_type, start_date, end_date, 
                base_salary, salary_type, file_key, file_metadata_id, 
                status, signed_at, created_by, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                new_id,
                emp_id,
                c_type,
                start_date,
                end_date,
                base_salary,
                s_type,
                file_key,
                file_metadata_id,
                "ACTIVE",   # Status 100% ACTIVE
                signed_at,
                admin_id,   # created_by
                None,       # updated_by
                signed_at,  # created_at
                signed_at,  # updated_at
            ),
        )

        file_log = f"FileID: {file_metadata_id}" if file_metadata_id else "No File"
        print(f"   [insert] EMP: {emp_id:<18} | {c_type:<9} | {s_type:<7} | Lương: {base_salary:10,.0f} | {file_log} (id={new_id})")