"""
degree.py
--------------
Seed dữ liệu cho bảng `degree`.
- Tự động lấy tất cả category_id đang có trong DB và gán ngẫu nhiên.
- Dữ liệu thực tế, đa dạng các trường Đại học.
"""

import random
from snowflake_id import snowflake

# Dữ liệu thực tế, phong phú hơn.
DEGREES = [
    # Nhóm miền Bắc & Hà Nội
    {"uni": "Đại học Bách Khoa Hà Nội (HUST)", "logo": "hust_logo.png", "title": "Cử nhân Khoa học Máy tính", "type": "BACHELORS", "dur": "4 Năm", "img": "hust_cs.jpg"},
    {"uni": "Đại học Bách Khoa Hà Nội (HUST)", "logo": "hust_logo.png", "title": "Thạc sĩ Khoa học Dữ liệu", "type": "MASTERS", "dur": "2 Năm", "img": "hust_ds_master.jpg"},
    {"uni": "Đại học Khoa học Tự nhiên, ĐHQGHN", "logo": "hus_logo.png", "title": "Cử nhân Toán học và Khoa học Máy tính", "type": "BACHELORS", "dur": "4 Năm", "img": "hus_math_cs.jpg"},
    {"uni": "Đại học Công nghệ, ĐHQGHN", "logo": "uet_logo.png", "title": "Cử nhân Kỹ thuật Máy tính", "type": "BACHELORS", "dur": "4 Năm", "img": "uet_ce.jpg"},
    {"uni": "Đại học Ngoại thương (FTU)", "logo": "ftu_logo.png", "title": "Cử nhân Kinh tế Đối ngoại", "type": "BACHELORS", "dur": "4 Năm", "img": "ftu_eco.jpg"},
    {"uni": "Đại học Ngoại thương (FTU)", "logo": "ftu_logo.png", "title": "Thạc sĩ Quản trị Kinh doanh (MBA)", "type": "MASTERS", "dur": "1.5 Năm", "img": "ftu_mba.jpg"},
    {"uni": "Đại học Kinh tế Quốc dân (NEU)", "logo": "neu_logo.png", "title": "Cử nhân Tài chính Ngân hàng", "type": "BACHELORS", "dur": "4 Năm", "img": "neu_finance.jpg"},
    {"uni": "Đại học Hà Nội (HANU)", "logo": "hanu_logo.png", "title": "Cử nhân Ngôn ngữ Anh", "type": "BACHELORS", "dur": "4 Năm", "img": "hanu_eng.jpg"},
    {"uni": "Đại học FPT", "logo": "fpt_logo.png", "title": "Cử nhân Kỹ thuật Phần mềm", "type": "BACHELORS", "dur": "3.5 Năm", "img": "fpt_se.jpg"},
    {"uni": "Đại học FPT", "logo": "fpt_logo.png", "title": "Cử nhân Thiết kế Đồ họa", "type": "BACHELORS", "dur": "3.5 Năm", "img": "fpt_design.jpg"},
    {"uni": "VinUni", "logo": "vinuni_logo.png", "title": "Cử nhân Khoa học Máy tính", "type": "BACHELORS", "dur": "4 Năm", "img": "vinuni_cs.jpg"},
    
    # Nhóm miền Nam
    {"uni": "RMIT University Vietnam", "logo": "rmit_logo.png", "title": "Cử nhân Truyền thông số", "type": "BACHELORS", "dur": "3 Năm", "img": "rmit_media.jpg"},
    {"uni": "RMIT University Vietnam", "logo": "rmit_logo.png", "title": "Cử nhân Kinh doanh Quốc tế", "type": "BACHELORS", "dur": "3 Năm", "img": "rmit_business.jpg"},
    {"uni": "ĐH Khoa học Tự nhiên, ĐHQG-HCM", "logo": "hcmus_logo.png", "title": "Cử nhân Trí tuệ Nhân tạo", "type": "BACHELORS", "dur": "4 Năm", "img": "hcmus_ai.jpg"},
    {"uni": "Đại học Bách Khoa, ĐHQG-HCM", "logo": "hcmut_logo.png", "title": "Kỹ sư Cơ điện tử", "type": "BACHELORS", "dur": "4.5 Năm", "img": "hcmut_mechatronics.jpg"},
    {"uni": "Đại học Kinh tế TP.HCM (UEH)", "logo": "ueh_logo.png", "title": "Cử nhân Marketing", "type": "BACHELORS", "dur": "3.5 Năm", "img": "ueh_marketing.jpg"},

    # Nhóm Quốc tế
    {"uni": "National University of Singapore (NUS)", "logo": "nus_logo.png", "title": "Master of Computing", "type": "MASTERS", "dur": "1.5 Năm", "img": "nus_computing.jpg"},
    {"uni": "Nanyang Technological University (NTU)", "logo": "ntu_logo.png", "title": "Bachelor of Data Science", "type": "BACHELORS", "dur": "4 Năm", "img": "ntu_ds.jpg"},
    {"uni": "Stanford University", "logo": "stanford_logo.png", "title": "Master of Computer Science", "type": "MASTERS", "dur": "2 Năm", "img": "stanford_cs.jpg"},
    {"uni": "MIT", "logo": "mit_logo.png", "title": "Master of Business Analytics", "type": "MASTERS", "dur": "1.5 Năm", "img": "mit_analytics.jpg"},
]

def get_all_category_ids(cursor):
    """Lấy danh sách tất cả category_id đang có trong DB."""
    cursor.execute("SELECT id FROM category")
    rows = cursor.fetchall()
    return [row["id"] for row in rows] if rows else []

def get_degree_id(cursor, university_name: str, title: str):
    """Kiểm tra xem bằng cấp này đã được seed chưa để tránh duplicate."""
    cursor.execute(
        "SELECT id FROM degree WHERE university_name = %s AND title = %s LIMIT 1", 
        (university_name, title)
    )
    row = cursor.fetchone()
    return row["id"] if row else None

def seed(cursor):
    """Insert dữ liệu degree."""
    print("→ Seeding degrees...")
    
    category_ids = get_all_category_ids(cursor)
    if not category_ids:
        print("   [error] Không có category nào trong DB! Vui lòng seed bảng category trước.")
        return

    count = 0
    for d in DEGREES:
        existing_id = get_degree_id(cursor, d["uni"], d["title"])
        if existing_id:
            print(f"   [skip] Bằng cấp '{d['title']}' tại '{d['uni']}' đã tồn tại.")
            continue
        
        # Chọn ngẫu nhiên 1 category_id đang có thật trong DB
        random_category_id = random.choice(category_ids)
        new_id = snowflake.next_id()
        
        cursor.execute(
            """
            INSERT INTO degree (
                id, category_id, university_name, university_logo, title, 
                type, duration, image, status, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (
                new_id, 
                random_category_id, 
                d["uni"], 
                d["logo"], 
                d["title"], 
                d["type"], 
                d["dur"], 
                d["img"], 
                "ACTIVE"
            ),
        )
        count += 1
        print(f"   [insert] {d['title']} - {d['uni']} (id={new_id})")
        
    print(f"   Đã thêm mới {count} degrees.")