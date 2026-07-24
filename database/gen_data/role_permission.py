"""
seed_role_permissions.py
--------------------------
Seed dữ liệu cho bảng `role_permissions` (gán quyền cho từng vai trò).

Lưu ý: file này PHẢI chạy sau seed_roles và seed_permissions,
vì cần tra `role_id` / `permission_id` đã tồn tại trong DB.
"""

from snowflake_id import snowflake

# role_code -> danh sách permission.name được gán
ROLE_PERMISSION_MAP = {
    "ADMIN": None,  # None = full quyền, sẽ tự lấy toàn bộ permissions.name trong DB
    "HR": [
        "user:create", "user:read", "user:update", "user:update:own",
        "role:read",
        "department:create", "department:read", "department:update",
        "employee:create", "employee:read", "employee:update",
        "timesheet:approve",
        "report:read",
    ],
    "TEACHER": [
        "user:update:own",
        "course:read", "course:update:own",
        "lesson:create", "lesson:read", "lesson:update:own", "lesson:delete:own",
        "assignment:create", "assignment:read",
        "submission:read", "submission:approve",
        "grade:create", "grade:update:own",
        "attendance:create",
    ],
    "TA": [
        "user:update:own",
        "course:read",
        "lesson:read",
        "assignment:read",
        "submission:read", "submission:approve",
        "attendance:create",
    ],
    "STUDENT": [
        "user:update:own",
        "course:read",
        "lesson:read",
        "assignment:read",
        "submission:create", "submission:update:own",
        "grade:read:own",
        "attendance:read:own",
    ],
}


def get_role_id(cursor, role_code: str):
    cursor.execute("SELECT id FROM role WHERE code = %s", (role_code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def get_permission_id(cursor, permission_name: str):
    cursor.execute("SELECT id FROM permission WHERE name = %s", (permission_name,))
    row = cursor.fetchone()
    return row["id"] if row else None


def get_all_permission_names(cursor):
    cursor.execute("SELECT name FROM permission")
    return [row["name"] for row in cursor.fetchall()]


def already_assigned(cursor, role_id, permission_id) -> bool:
    cursor.execute(
        "SELECT id FROM role_permission WHERE role_id = %s AND permission_id = %s",
        (role_id, permission_id),
    )
    return cursor.fetchone() is not None


def seed(cursor):
    """Insert dữ liệu role_permissions nếu chưa tồn tại (idempotent theo role_id + permission_id)."""
    print("→ Seeding role_permissions...")
    for role_code, permission_names in ROLE_PERMISSION_MAP.items():
        role_id = get_role_id(cursor, role_code)
        if not role_id:
            print(f"   [warn] không tìm thấy role {role_code}, bỏ qua.")
            continue

        names = permission_names if permission_names is not None else get_all_permission_names(cursor)

        inserted = 0
        for perm_name in names:
            perm_id = get_permission_id(cursor, perm_name)
            if not perm_id:
                print(f"   [warn] không tìm thấy permission {perm_name}, bỏ qua.")
                continue
            if already_assigned(cursor, role_id, perm_id):
                continue
            new_id = snowflake.next_id()
            cursor.execute(
                """
                INSERT INTO role_permission (id, role_id, permission_id, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
                """,
                (new_id, role_id, perm_id),
            )
            inserted += 1
        print(f"   [ok] role {role_code}: đã thêm mới {inserted}/{len(names)} permission(s)")