"""Đồng bộ người giám hộ cho 12 học viên vị thành niên trong dataset."""

from identity_dataset import PEOPLE, student_profile
from snowflake_id import snowflake


def get_admin_id(cursor) -> int:
    """Lấy admin user ID dùng cho audit guardian."""
    cursor.execute("SELECT id FROM user WHERE username='admin.report'")
    row = cursor.fetchone()
    if not row:
        raise ValueError("Thiếu admin.report trước khi seed guardian")
    return row["id"]


def get_student_ids(cursor) -> dict[str, int]:
    """Lấy user ID thật của 50 học viên dataset."""
    usernames = tuple(person["username"] for person in PEOPLE if person["role"] == "STUDENT")
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(f"SELECT id, username FROM user WHERE username IN ({placeholders})", usernames)
    students = {row["username"]: row["id"] for row in cursor.fetchall()}
    if len(students) != 50:
        raise ValueError(f"Cần đủ 50 students trước khi seed guardian, hiện có {len(students)}")
    return students


def guardian_payload(person: dict, relationship: str) -> dict:
    """Tạo thông tin liên hệ người giám hộ ổn định theo học viên và quan hệ."""
    ordinal = person["ordinal"]
    surname = person["full_name"].split()[0]
    father_names = ("Hùng", "Mạnh", "Sơn", "Thành", "Trung", "Đức")
    mother_names = ("Hương", "Hoa", "Thủy", "Trang", "Yến", "Phương")
    if relationship == "FATHER":
        full_name = f"{surname} Văn {father_names[(ordinal - 1) % len(father_names)]}"
    else:
        full_name = f"{surname} Thị {mother_names[(ordinal - 1) % len(mother_names)]}"
    suffix = 1 if relationship == "FATHER" else 2
    return {
        "full_name": full_name,
        "relationship": relationship,
        "phone": f"08{ordinal:06d}{suffix:02d}",
        "email": f"phuhuynh.student{ordinal:02d}.{relationship.lower()}@demo.ailms.vn",
        "address": f"Số {30 + ordinal}, phường Trung Hòa, quận Cầu Giấy, Hà Nội",
    }


def synchronize_guardian(cursor, student_id: int, payload: dict, admin_id: int, timestamp) -> bool:
    """Upsert guardian theo cặp học viên và quan hệ, bảo toàn ID hiện hữu."""
    cursor.execute(
        "SELECT id FROM guardian WHERE student_user_id=%s AND relationship=%s ORDER BY id LIMIT 1",
        (student_id, payload["relationship"]),
    )
    existing = cursor.fetchone()
    if existing:
        cursor.execute(
            """
            UPDATE guardian
            SET full_name=%s, phone=%s, email=%s, address=%s,
                updated_by=%s, updated_at=%s
            WHERE id=%s
            """,
            (
                payload["full_name"],
                payload["phone"],
                payload["email"],
                payload["address"],
                admin_id,
                timestamp,
                existing["id"],
            ),
        )
        return False

    cursor.execute(
        """
        INSERT INTO guardian (
            id, student_user_id, full_name, relationship, phone, email,
            address, created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s)
        """,
        (
            snowflake.next_id(),
            student_id,
            payload["full_name"],
            payload["relationship"],
            payload["phone"],
            payload["email"],
            payload["address"],
            admin_id,
            timestamp,
            timestamp,
        ),
    )
    return True


def seed(cursor) -> None:
    """Tạo một guardian chính cho 12 minor và guardian thứ hai cho 4 trường hợp."""
    print("→ Seeding final-report guardians...")
    admin_id = get_admin_id(cursor)
    students = get_student_ids(cursor)
    inserted = 0
    synchronized = 0
    expected = 0
    for person in (item for item in PEOPLE if item["role"] == "STUDENT"):
        if not student_profile(person)["is_minor"]:
            cursor.execute("DELETE FROM guardian WHERE student_user_id=%s", (students[person["username"]],))
            continue
        relationships = ["FATHER" if person["ordinal"] % 2 else "MOTHER"]
        if person["ordinal"] <= 4:
            relationships.append("MOTHER" if relationships[0] == "FATHER" else "FATHER")
        expected += len(relationships)
        for relationship in relationships:
            was_inserted = synchronize_guardian(
                cursor,
                students[person["username"]],
                guardian_payload(person, relationship),
                admin_id,
                person["created_at"],
            )
            inserted += int(was_inserted)
            synchronized += int(not was_inserted)
    print(f"   [completed] guardians: inserted={inserted}, synchronized={synchronized}, expected={expected}")
