"""Đồng bộ 100 tài khoản định danh của bộ dữ liệu báo cáo cuối cùng."""

from snowflake_id import snowflake

from identity_dataset import PEOPLE


def find_existing_user(cursor, username: str, email: str):
    """Tìm user theo username hoặc email và phát hiện xung đột định danh."""
    cursor.execute(
        "SELECT id, username, email FROM user WHERE username = %s OR email = %s ORDER BY id",
        (username, email),
    )
    rows = cursor.fetchall()
    if len(rows) > 1:
        raise ValueError(f"Username/email seed xung đột với nhiều user: {username}, {email}")
    if rows and (rows[0]["username"] != username or rows[0]["email"] != email):
        raise ValueError(f"Username/email seed đang thuộc định danh khác: {username}, {email}")
    return rows[0] if rows else None


def insert_user(cursor, person: dict) -> int:
    """Tạo user mới bằng Snowflake ID và để avatar được gán sau khi upload MinIO."""
    user_id = snowflake.next_id()
    cursor.execute(
        """
        INSERT INTO user (
            id, username, email, password_hash, full_name, phone, avatar_url,
            gender, date_of_birth, attributes, status, status_before_delete,
            last_login_at, created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, NULL, %s, %s, %s, %s, NULL, %s, NULL, NULL, %s, %s)
        """,
        (
            user_id,
            person["username"],
            person["email"],
            person["password_hash"],
            person["full_name"],
            person["phone"],
            person["gender"],
            person["date_of_birth"],
            person["attributes"],
            person["status"],
            person["last_login_at"],
            person["created_at"],
            person["created_at"],
        ),
    )
    return user_id


def update_user(cursor, user_id: int, person: dict) -> None:
    """Chuẩn hóa hồ sơ user seed mà không đổi ID, code hoặc avatar ngoài bước asset."""
    cursor.execute(
        """
        UPDATE user
        SET password_hash=%s, full_name=%s, phone=%s, gender=%s,
            date_of_birth=%s, attributes=%s, status=%s,
            status_before_delete=NULL, last_login_at=%s, updated_at=%s
        WHERE id=%s
        """,
        (
            person["password_hash"],
            person["full_name"],
            person["phone"],
            person["gender"],
            person["date_of_birth"],
            person["attributes"],
            person["status"],
            person["last_login_at"],
            person["created_at"],
            user_id,
        ),
    )


def seed(cursor) -> None:
    """Upsert đúng 100 tài khoản bằng khóa tự nhiên username/email."""
    print("→ Seeding final-report users (50 employees + 50 students)...")
    inserted = 0
    updated = 0
    for person in PEOPLE:
        existing = find_existing_user(cursor, person["username"], person["email"])
        if existing:
            update_user(cursor, existing["id"], person)
            updated += 1
        else:
            insert_user(cursor, person)
            inserted += 1
    print(f"   [completed] users: inserted={inserted}, synchronized={updated}, total={len(PEOPLE)}")
