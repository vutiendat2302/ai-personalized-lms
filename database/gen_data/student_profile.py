"""Đồng bộ đúng 50 hồ sơ học viên nhất quán với tuổi và mục tiêu học tập."""

from identity_dataset import PEOPLE, student_profile


def get_admin_id(cursor) -> int:
    """Lấy admin user ID để ghi audit hồ sơ học viên."""
    cursor.execute("SELECT id FROM user WHERE username='admin.report'")
    row = cursor.fetchone()
    if not row:
        raise ValueError("Thiếu admin.report trước khi seed student_profile")
    return row["id"]


def get_student_users(cursor) -> dict[str, int]:
    """Lấy chính xác 50 user STUDENT thuộc dataset."""
    usernames = tuple(person["username"] for person in PEOPLE if person["role"] == "STUDENT")
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(f"SELECT id, username FROM user WHERE username IN ({placeholders})", usernames)
    users = {row["username"]: row["id"] for row in cursor.fetchall()}
    if len(users) != 50:
        raise ValueError(f"Cần đủ 50 student users, hiện có {len(users)}")
    return users


def synchronize_profile(cursor, user_id: int, profile: dict, admin_id: int, timestamp) -> bool:
    """Tạo hoặc chuẩn hóa student profile mà không thay đổi student_code đã cấp."""
    cursor.execute("SELECT student_code FROM student_profile WHERE user_id=%s", (user_id,))
    existing = cursor.fetchone()
    if existing:
        cursor.execute(
            """
            UPDATE student_profile
            SET education_level=%s, description=%s, goal=%s, school_name=%s,
                has_goal=%s, is_minor=%s, updated_by=%s, updated_at=%s
            WHERE user_id=%s
            """,
            (
                profile["education_level"],
                profile["description"],
                profile["goal"],
                profile["school_name"],
                profile["has_goal"],
                profile["is_minor"],
                admin_id,
                timestamp,
                user_id,
            ),
        )
        return False

    cursor.execute(
        """
        INSERT INTO student_profile (
            user_id, student_code, education_level, description, goal,
            school_name, has_goal, is_minor, created_by, updated_by,
            created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s)
        """,
        (
            user_id,
            profile["student_code"],
            profile["education_level"],
            profile["description"],
            profile["goal"],
            profile["school_name"],
            profile["has_goal"],
            profile["is_minor"],
            admin_id,
            timestamp,
            timestamp,
        ),
    )
    return True


def seed(cursor) -> None:
    """Sinh 12 hồ sơ vị thành niên và 38 hồ sơ trưởng thành có dữ liệu đầy đủ."""
    print("→ Seeding final-report student profiles...")
    admin_id = get_admin_id(cursor)
    users = get_student_users(cursor)
    inserted = 0
    synchronized = 0
    minor_count = 0
    for person in (item for item in PEOPLE if item["role"] == "STUDENT"):
        profile = student_profile(person)
        minor_count += int(profile["is_minor"])
        was_inserted = synchronize_profile(
            cursor,
            users[person["username"]],
            profile,
            admin_id,
            person["created_at"],
        )
        inserted += int(was_inserted)
        synchronized += int(not was_inserted)
    print(
        f"   [completed] student_profile: inserted={inserted}, synchronized={synchronized}, "
        f"minor={minor_count}, adult={50 - minor_count}"
    )
