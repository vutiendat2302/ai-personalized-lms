"""Seed quan hệ định danh giữa sở thích cố định và danh mục khóa học cố định."""

INTEREST_CATEGORY_MAPPINGS = [
    ("IT_PROGRAMMING", "Kỹ thuật phần mềm"),
    ("IT_PROGRAMMING", "Lập trình Backend"),
    ("IT_PROGRAMMING", "Lập trình Frontend"),
    ("WEB_DEVELOPMENT", "Lập trình Web"),
    ("WEB_DEVELOPMENT", "Lập trình Backend"),
    ("WEB_DEVELOPMENT", "Lập trình Frontend"),
    ("MOBILE_DEVELOPMENT", "Lập trình Mobile"),
    ("DATA_SCIENCE", "Khoa học dữ liệu & AI"),
    ("DATA_SCIENCE", "Xác suất & Thống kê"),
    ("ARTIFICIAL_INTELLIGENCE", "Khoa học dữ liệu & AI"),
    ("CYBER_SECURITY", "An toàn thông tin"),
    ("DATABASE_SYSTEM", "Cơ sở dữ liệu"),
    ("CLOUD_COMPUTING", "DevOps & Cloud"),
    ("GRAPHIC_DESIGN", "Thiết kế đồ họa"),
    ("UI_UX_DESIGN", "Thiết kế UI/UX"),
    ("VIDEO_EDITING", "Dựng phim & Video"),
    ("MOTION_GRAPHIC", "Dựng phim & Video"),
    ("BUSINESS_ADMIN", "Kinh doanh & Khởi nghiệp"),
    ("DIGITAL_MARKETING", "Marketing số"),
    ("ENTREPRENEURSHIP", "Kinh doanh & Khởi nghiệp"),
    ("FINANCE_INVESTMENT", "Tài chính & Đầu tư"),
    ("ENGLISH_LANGUAGE", "Tiếng Anh giao tiếp"),
    ("ENGLISH_LANGUAGE", "Tiếng Anh luyện thi"),
    ("JAPANESE_LANGUAGE", "Tiếng Nhật"),
    ("KOREAN_LANGUAGE", "Tiếng Hàn"),
    ("CHINESE_LANGUAGE", "Tiếng Trung"),
    ("MATHEMATICS", "Toán học phổ thông"),
    ("MATHEMATICS", "Toán cao cấp"),
    ("PHYSICS", "Vật lý"),
    ("CHEMISTRY", "Hóa học"),
    ("BIOLOGY", "Sinh học"),
    ("PUBLIC_SPEAKING", "Kỹ năng mềm"),
    ("SOFT_SKILLS", "Kỹ năng mềm"),
    ("CAREER_ORIENTATION", "Kỹ năng mềm"),
    ("LEADERSHIP", "Kỹ năng mềm"),
]


def seed(cursor):
    """Chèn các cặp interest/category có thật và bỏ qua cặp đã tồn tại."""
    print("→ Seeding interest_category (Sở thích - Danh mục)...")
    inserted = 0
    skipped = 0
    for interest_code, category_name in INTEREST_CATEGORY_MAPPINGS:
        cursor.execute("SELECT id FROM interest WHERE code = %s", (interest_code,))
        interest = cursor.fetchone()
        cursor.execute("SELECT id FROM category WHERE name = %s", (category_name,))
        category = cursor.fetchone()
        if not interest or not category:
            skipped += 1
            continue
        cursor.execute(
            """
            INSERT IGNORE INTO interest_category (interest_id, category_id)
            VALUES (%s, %s)
            """,
            (interest["id"], category["id"]),
        )
        inserted += cursor.rowcount
    print(f"   [completed] interest_category inserted: {inserted}, skipped: {skipped}")
