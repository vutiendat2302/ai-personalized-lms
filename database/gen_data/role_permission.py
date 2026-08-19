"""Ma trận quyền chuẩn cho các role hệ thống AILMS."""

from permission import PERMISSIONS
from snowflake_id import snowflake


ROLE_PERMISSION_MAP = {
    "ADMIN": None,
    "HR": {
        "user:create", "user:read", "user:update", "user:status", "role:read",
        "department:create", "department:read", "department:update",
        "employee:create", "employee:read", "employee:update", "employee:delete",
        "contract:create", "contract:read", "contract:update", "contract:approve",
        "leave:read", "leave:approve", "timesheet:approve",
        "course:read", "course:approve", "course:publish",
        "class:create", "class:read", "class:update", "class:delete",
        "class:assign-teacher", "class:manage-member", "class:manage-schedule",
        "attendance:read", "enrollment:read", "enrollment:manage",
        "order:read", "order:manage", "order:refund",
        "payment:read", "payment:reconcile",
        "coupon:create", "coupon:read", "coupon:update", "coupon:delete",
        "finance:report", "finance:payroll", "report:read",
        "file:upload", "file:read", "file:manage",
        "support:manage", "notification:read:own", "notification:manage:own",
    },
    "SUPPORT": {
        "user:read", "course:read", "class:read", "enrollment:read",
        "order:read", "payment:read", "coupon:read",
        "support:chat", "file:read", "notification:read:own", "notification:manage:own",
        "ai:use",
    },
    "TEACHER": {
        "user:update:own", "course:create", "course:read", "course:update:own",
        "lesson:create", "lesson:read", "lesson:update:own", "lesson:delete:own",
        "class:read", "class:manage-member", "class:manage-schedule",
        "attendance:manage", "attendance:create", "assessment:create", "assessment:read",
        "assessment:update:own", "assessment:grade", "assignment:create", "assignment:read",
        "submission:read", "submission:approve", "grade:create", "grade:update:own",
        "leave:create:own", "leave:read:own", "leave:cancel:own",
        "file:upload", "file:read", "notification:read:own", "notification:manage:own", "ai:use",
    },
    "TA": {
        "user:update:own", "course:read", "lesson:read", "class:read",
        "class:manage-member", "attendance:manage", "attendance:create",
        "assessment:read", "assessment:grade", "assignment:read",
        "submission:read", "submission:approve",
        "leave:create:own", "leave:read:own", "leave:cancel:own",
        "file:upload", "file:read", "notification:read:own", "notification:manage:own", "ai:use",
    },
    "STUDENT": {
        "user:update:own", "course:read", "lesson:read", "class:read",
        "attendance:read:own", "assessment:read",
        "submission:create", "submission:read:own", "submission:update:own", "grade:read:own",
        "enrollment:read:own", "cart:manage:own",
        "order:create:own", "order:read:own", "payment:create:own", "payment:read:own",
        "coupon:read", "coupon:redeem", "file:upload", "file:read",
        "notification:read:own", "notification:manage:own", "ai:use",
    },
}


def get_role_id(cursor, role_code: str):
    """Tìm role ID theo code."""
    cursor.execute("SELECT id FROM role WHERE code = %s", (role_code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def get_permissions_map(cursor):
    """Tải permission name -> ID một lần để tránh truy vấn N+1."""
    cursor.execute("SELECT id, name FROM permission")
    return {row["name"]: row["id"] for row in cursor.fetchall()}


def already_assigned(cursor, role_id, permission_id):
    """Kiểm tra cặp role/permission đã tồn tại."""
    cursor.execute(
        "SELECT id FROM role_permission WHERE role_id=%s AND permission_id=%s",
        (role_id, permission_id),
    )
    return cursor.fetchone() is not None


def validate_matrix():
    """Đảm bảo mọi quyền khai báo trong ma trận thuộc master catalog."""
    catalog_names = {item[0] for item in PERMISSIONS}
    unknown = sorted({name for names in ROLE_PERMISSION_MAP.values() if names for name in names} - catalog_names)
    if unknown:
        raise ValueError(f"Role matrix tham chiếu permission chưa khai báo: {unknown}")


def seed(cursor):
    """Bổ sung các quyền còn thiếu cho từng role hệ thống theo ma trận chuẩn."""
    validate_matrix()
    print("→ Seeding role_permissions...")
    permissions = get_permissions_map(cursor)
    catalog_names = {item[0] for item in PERMISSIONS}

    for role_code, configured_names in ROLE_PERMISSION_MAP.items():
        role_id = get_role_id(cursor, role_code)
        if not role_id:
            raise ValueError(f"Không tìm thấy system role {role_code}.")
        names = catalog_names if configured_names is None else configured_names
        inserted = 0
        for name in sorted(names):
            permission_id = permissions.get(name)
            if permission_id is None:
                raise ValueError(f"Không tìm thấy permission {name} trong database.")
            if already_assigned(cursor, role_id, permission_id):
                continue
            cursor.execute(
                """INSERT INTO role_permission
                   (id, role_id, permission_id, granted_at, created_at, updated_at)
                   VALUES (%s, %s, %s, NOW(), NOW(), NOW())""",
                (snowflake.next_id(), role_id, permission_id),
            )
            inserted += 1
        print(f"   [ok] role {role_code}: required={len(names)}, inserted={inserted}")
