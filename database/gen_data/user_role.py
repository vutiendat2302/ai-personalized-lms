"""Đồng bộ một role chính cho từng tài khoản thuộc bộ dữ liệu báo cáo."""

from snowflake_id import snowflake

from identity_dataset import PEOPLE


def get_role_ids(cursor) -> dict[str, int]:
    """Lấy ID của toàn bộ role bắt buộc theo code."""
    required_codes = {person["role"] for person in PEOPLE}
    placeholders = ",".join(["%s"] * len(required_codes))
    cursor.execute(
        f"SELECT id, code FROM role WHERE code IN ({placeholders})",
        tuple(sorted(required_codes)),
    )
    role_ids = {row["code"]: row["id"] for row in cursor.fetchall()}
    missing = required_codes - role_ids.keys()
    if missing:
        raise ValueError(f"Thiếu role master data: {sorted(missing)}")
    return role_ids


def get_dataset_users(cursor) -> dict[str, int]:
    """Lấy user ID thật theo danh sách username cố định của dataset."""
    usernames = tuple(person["username"] for person in PEOPLE)
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(
        f"SELECT id, username FROM user WHERE username IN ({placeholders})",
        usernames,
    )
    users = {row["username"]: row["id"] for row in cursor.fetchall()}
    missing = set(usernames) - users.keys()
    if missing:
        raise ValueError(f"Thiếu user trước khi gán role: {sorted(missing)}")
    return users


def synchronize_role(cursor, user_id: int, role_id: int, admin_user_id: int, assigned_at) -> bool:
    """Giữ đúng một role chính và cập nhật audit gán role cho user seed."""
    cursor.execute("DELETE FROM user_role WHERE user_id=%s AND role_id<>%s", (user_id, role_id))
    cursor.execute(
        "SELECT id FROM user_role WHERE user_id=%s AND role_id=%s ORDER BY id",
        (user_id, role_id),
    )
    existing_rows = cursor.fetchall()
    if existing_rows:
        existing = existing_rows[0]
        duplicate_ids = tuple(row["id"] for row in existing_rows[1:])
        if duplicate_ids:
            placeholders = ",".join(["%s"] * len(duplicate_ids))
            cursor.execute(f"DELETE FROM user_role WHERE id IN ({placeholders})", duplicate_ids)
        cursor.execute(
            """
            UPDATE user_role
            SET assigned_by=%s, assigned_at=%s, expired_at=NULL,
                scope_type=NULL, scope_id=NULL, updated_at=%s
            WHERE id=%s
            """,
            (admin_user_id, assigned_at, assigned_at, existing["id"]),
        )
        return False

    cursor.execute(
        """
        INSERT INTO user_role (
            id, user_id, role_id, assigned_by, assigned_at, expired_at,
            scope_type, scope_id, created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, NULL, NULL, NULL, %s, NULL, %s, %s)
        """,
        (
            snowflake.next_id(),
            user_id,
            role_id,
            admin_user_id,
            assigned_at,
            admin_user_id,
            assigned_at,
            assigned_at,
        ),
    )
    return True


def seed(cursor) -> None:
    """Gán role xác định và dùng đúng admin user ID cho assigned_by."""
    print("→ Seeding final-report user roles...")
    role_ids = get_role_ids(cursor)
    users = get_dataset_users(cursor)
    admin_user_id = users["admin.report"]
    inserted = 0
    synchronized = 0
    for person in PEOPLE:
        was_inserted = synchronize_role(
            cursor,
            users[person["username"]],
            role_ids[person["role"]],
            admin_user_id,
            person["created_at"],
        )
        inserted += int(was_inserted)
        synchronized += int(not was_inserted)
    print(f"   [completed] user_role: inserted={inserted}, synchronized={synchronized}")
