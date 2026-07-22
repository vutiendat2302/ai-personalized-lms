"""
seed_roles.py
--------------
Seed dữ liệu cho bảng `roles` (5 role: ADMIN, HR, TEACHER, TA, STUDENT).
"""

from snowflake_id import snowflake

ROLES = [
    {"code": "ADMIN", "name": "Quản trị viên",
     "description": "Toàn quyền quản trị hệ thống, cấu hình và phân quyền.",
     "is_system": True},
    {"code": "HR", "name": "Nhân sự",
     "description": "Quản lý hồ sơ nhân viên, phòng ban và chấm công.",
     "is_system": True},
    {"code": "TEACHER", "name": "Giảng viên",
     "description": "Phụ trách giảng dạy, xây dựng nội dung và chấm điểm khóa học.",
     "is_system": True},
    {"code": "TA", "name": "Trợ giảng",
     "description": "Hỗ trợ giảng viên trong việc quản lý lớp học và chấm bài.",
     "is_system": True},
    {"code": "STUDENT", "name": "Sinh viên",
     "description": "Người học, tham gia khóa học và nộp bài tập.",
     "is_system": True},
]


def get_id_by_code(cursor, code: str):
    cursor.execute("SELECT id FROM role WHERE code = %s", (code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Insert dữ liệu role nếu chưa tồn tại (idempotent theo `code`)."""
    print("→ Seeding roles...")
    for r in ROLES:
        existing_id = get_id_by_code(cursor, r["code"])
        if existing_id:
            print(f"   [skip] role {r['code']} đã tồn tại (id={existing_id})")
            continue
        new_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO role (id, name, code, description, is_system, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (new_id, r["name"], r["code"], r["description"], r["is_system"]),
        )
        print(f"   [insert] role {r['code']} (id={new_id})")