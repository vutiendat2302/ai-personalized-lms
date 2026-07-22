"""
seed_departments.py
--------------------
Seed dữ liệu cho bảng `departments` (chưa phân cấp bậc).
"""

from snowflake_id import snowflake

DEPARTMENTS = [
    {"code": "ACADEMIC", "name": "Phòng Đào tạo",
     "description": "Quản lý chương trình đào tạo, kế hoạch giảng dạy và học vụ.",
     "status": "ACTIVE"},
    {"code": "IT", "name": "Phòng Công nghệ thông tin",
     "description": "Quản trị hệ thống, hạ tầng CNTT và hỗ trợ kỹ thuật.",
     "status": "ACTIVE"},
    {"code": "HR", "name": "Phòng Nhân sự",
     "description": "Quản lý tuyển dụng, hồ sơ nhân sự và chính sách nhân viên.",
     "status": "ACTIVE"},
    {"code": "FINANCE", "name": "Phòng Tài chính - Kế toán",
     "description": "Quản lý học phí, lương và các khoản thu chi.",
     "status": "ACTIVE"},
    {"code": "STUDENT_AFF", "name": "Phòng Công tác Sinh viên",
     "description": "Hỗ trợ đời sống, sinh hoạt và kỷ luật sinh viên.",
     "status": "ACTIVE"},
    {"code": "LIBRARY", "name": "Thư viện",
     "description": "Quản lý tài nguyên học liệu, sách và phòng đọc.",
     "status": "ACTIVE"},
    {"code": "MARKETING", "name": "Phòng Truyền thông - Tuyển sinh",
     "description": "Truyền thông thương hiệu và tư vấn tuyển sinh.",
     "status": "ACTIVE"},
    {"code": "FACILITY", "name": "Phòng Quản trị - Cơ sở vật chất",
     "description": "Quản lý phòng học, trang thiết bị và tài sản.",
     "status": "INACTIVE"},
]


def get_id_by_code(cursor, code: str):
    cursor.execute("SELECT id FROM department WHERE code = %s", (code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Insert dữ liệu department nếu chưa tồn tại (idempotent theo `code`)."""
    print("→ Seeding departments...")
    for d in DEPARTMENTS:
        existing_id = get_id_by_code(cursor, d["code"])
        if existing_id:
            print(f"   [skip] department {d['code']} đã tồn tại (id={existing_id})")
            continue
        new_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO department (id, code, name, description, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (new_id, d["code"], d["name"], d["description"], d["status"]),
        )
        print(f"   [insert] department {d['code']} (id={new_id})")