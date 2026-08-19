"""Master data cơ cấu tổ chức chuẩn của AILMS."""

from snowflake_id import snowflake

DEPARTMENTS = [
    {"code": "ACADEMIC", "name": "Phòng Đào tạo & Học vụ", "description": "Quản trị chương trình, kế hoạch đào tạo, lịch học và chất lượng học vụ.", "status": "ACTIVE"},
    {"code": "CONTENT", "name": "Trung tâm Phát triển Học liệu", "description": "Thiết kế chương trình, sản xuất và chuẩn hóa nội dung học tập số.", "status": "ACTIVE"},
    {"code": "QUALITY", "name": "Phòng Đảm bảo Chất lượng", "description": "Kiểm định nội dung, đánh giá giảng dạy và cải tiến chất lượng đào tạo.", "status": "ACTIVE"},
    {"code": "STUDENT_SUCCESS", "name": "Trung tâm Thành công Học viên", "description": "Tư vấn lộ trình, theo dõi tiến độ và hỗ trợ trải nghiệm học viên.", "status": "ACTIVE"},
    {"code": "HR", "name": "Phòng Nhân sự", "description": "Tuyển dụng, hồ sơ nhân sự, hợp đồng, chấm công và phát triển đội ngũ.", "status": "ACTIVE"},
    {"code": "FINANCE", "name": "Phòng Tài chính - Kế toán", "description": "Quản trị doanh thu, học phí, hoàn tiền, công nợ, lương và báo cáo tài chính.", "status": "ACTIVE"},
    {"code": "SALES", "name": "Phòng Kinh doanh", "description": "Quản lý danh mục bán, đơn hàng, chương trình ưu đãi và hiệu quả kinh doanh.", "status": "ACTIVE"},
    {"code": "MARKETING", "name": "Phòng Marketing & Truyền thông", "description": "Phát triển thương hiệu, nội dung truyền thông và thu hút học viên tiềm năng.", "status": "ACTIVE"},
    {"code": "IT", "name": "Phòng Công nghệ Thông tin", "description": "Phát triển sản phẩm, vận hành nền tảng, dữ liệu, bảo mật và hỗ trợ kỹ thuật.", "status": "ACTIVE"},
    {"code": "SUPPORT", "name": "Trung tâm Hỗ trợ Khách hàng", "description": "Tiếp nhận, phân loại và xử lý yêu cầu hỗ trợ trước và sau đăng ký.", "status": "ACTIVE"},
    {"code": "OPERATIONS", "name": "Phòng Vận hành Đào tạo", "description": "Điều phối lớp, phân công giáo viên, quản lý lịch và xử lý sự cố vận hành.", "status": "ACTIVE"},
    {"code": "FACILITY", "name": "Phòng Hành chính - Cơ sở vật chất", "description": "Quản lý hành chính, tài sản, trang thiết bị và điều kiện làm việc.", "status": "ACTIVE"},
]


def get_id_by_code(cursor, code: str):
    cursor.execute("SELECT id FROM department WHERE code = %s", (code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Đồng bộ department theo code, cập nhật mô tả mà không đổi ID hiện hữu."""
    print("→ Seeding departments...")
    for d in DEPARTMENTS:
        existing_id = get_id_by_code(cursor, d["code"])
        if existing_id:
            cursor.execute(
                """UPDATE department SET name=%s, description=%s, status=%s, updated_at=NOW()
                   WHERE id=%s""",
                (d["name"], d["description"], d["status"], existing_id),
            )
            print(f"   [update] department {d['code']} (id={existing_id})")
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
