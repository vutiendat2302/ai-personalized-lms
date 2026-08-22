"""Đồng bộ đúng 50 hồ sơ nhân viên theo role và cơ cấu tổ chức."""

from identity_dataset import PEOPLE, employee_profile


def get_admin_id(cursor) -> int:
    """Lấy user ID của tài khoản quản trị dataset cho trường audit."""
    cursor.execute("SELECT id FROM user WHERE username='admin.report'")
    row = cursor.fetchone()
    if not row:
        raise ValueError("Thiếu admin.report trước khi seed employee")
    return row["id"]


def get_department_ids(cursor) -> dict[str, int]:
    """Lấy phòng ban thật theo code để không gán khóa ngoại ngẫu nhiên."""
    cursor.execute("SELECT id, code FROM department")
    departments = {row["code"]: row["id"] for row in cursor.fetchall()}
    required = {employee_profile(person)["department_code"] for person in PEOPLE if person["role"] != "STUDENT"}
    missing = required - departments.keys()
    if missing:
        raise ValueError(f"Thiếu department master data: {sorted(missing)}")
    return departments


def get_employee_users(cursor) -> dict[str, int]:
    """Lấy ID thật của 50 user nhân viên theo username dataset."""
    usernames = tuple(person["username"] for person in PEOPLE if person["role"] != "STUDENT")
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(f"SELECT id, username FROM user WHERE username IN ({placeholders})", usernames)
    users = {row["username"]: row["id"] for row in cursor.fetchall()}
    if len(users) != 50:
        raise ValueError(f"Cần đủ 50 employee users, hiện có {len(users)}")
    return users


def synchronize_employee(cursor, user_id: int, profile: dict, department_id: int, admin_id: int) -> bool:
    """Tạo hoặc chuẩn hóa employee nhưng không cập nhật employee_code đã được cấp."""
    cursor.execute("SELECT employee_code FROM employee WHERE user_id=%s", (user_id,))
    existing = cursor.fetchone()
    if existing:
        cursor.execute(
            """
            UPDATE employee
            SET department_id=%s, position=%s, bio=%s, employment_type=%s,
                start_date=%s, end_date=%s, address=%s, status=%s,
                updated_by=%s, updated_at=%s
            WHERE user_id=%s
            """,
            (
                department_id,
                profile["position"],
                profile["bio"],
                profile["employment_type"],
                profile["start_date"],
                profile["end_date"],
                profile["address"],
                profile["status"],
                admin_id,
                profile["start_date"],
                user_id,
            ),
        )
        return False

    cursor.execute(
        """
        INSERT INTO employee (
            user_id, employee_code, department_id, position, bio,
            employment_type, start_date, end_date, address, status,
            created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s)
        """,
        (
            user_id,
            profile["employee_code"],
            department_id,
            profile["position"],
            profile["bio"],
            profile["employment_type"],
            profile["start_date"],
            profile["end_date"],
            profile["address"],
            profile["status"],
            admin_id,
            profile["start_date"],
            profile["start_date"],
        ),
    )
    return True


def seed(cursor) -> None:
    """Tạo đủ hồ sơ ADMIN, HR, SUPPORT, TEACHER và TA theo phân bố cố định."""
    print("→ Seeding final-report employees...")
    admin_id = get_admin_id(cursor)
    departments = get_department_ids(cursor)
    users = get_employee_users(cursor)
    inserted = 0
    synchronized = 0
    for person in (item for item in PEOPLE if item["role"] != "STUDENT"):
        profile = employee_profile(person)
        was_inserted = synchronize_employee(
            cursor,
            users[person["username"]],
            profile,
            departments[profile["department_code"]],
            admin_id,
        )
        inserted += int(was_inserted)
        synchronized += int(not was_inserted)
    print(f"   [completed] employees: inserted={inserted}, synchronized={synchronized}, total=50")
