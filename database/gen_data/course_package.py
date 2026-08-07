"""
course_package.py
------------------
Seed dữ liệu cho bảng `course_package` (Gói học).
Tạo các gói học thực tế cho từng khóa học (Gói Tự Học, Gói Lớp Online, Gói Hybrid, Gói Kèm 1-1).
"""

import random
from snowflake_id import snowflake

random.seed(2026)

PACKAGE_TEMPLATES = [
    {
        "name": "Gói Tự Học Standard (Lifetime)",
        "delivery_mode": "SELF_STUDY",
        "price_factor": 0.7,
        "duration_days": 365,
        "included_tutor_sessions": 0,
        "max_group_size": None,
        "description": "Truy cập video trọn đời, tự học theo lộ trình cá nhân hóa, làm quiz & bài tập tự động.",
    },
    {
        "name": "Gói Lớp Online Live Class",
        "delivery_mode": "GROUP_CLASS",
        "price_factor": 0.85,
        "duration_days": 90,
        "included_tutor_sessions": 4,
        "max_group_size": 25,
        "description": "Học trực tuyến qua video conference 2 buổi/tuần với giảng viên, giải đáp thắc mắc trực tiếp.",
    },
    {
        "name": "Gói Lớp Hybrid 2026",
        "delivery_mode": "COMBO",
        "price_factor": 0.9,
        "duration_days": 180,
        "included_tutor_sessions": 8,
        "max_group_size": 15,
        "description": "Kết hợp tự học video linh hoạt + 1 buổi review trực tuyến hàng tuần + chữa bài 1-1.",
    },
    {
        "name": "Gói Kèm 1-1 Chuyên Sâu Pro",
        "delivery_mode": "ONE_ON_ONE",
        "price_factor": 1.0,
        "duration_days": 120,
        "included_tutor_sessions": 16,
        "max_group_size": 1,
        "description": "1 Mentor kèm riêng 1-1 suốt lộ trình, review code từng commit, hỗ trợ tư vấn tuyển dụng & CV.",
    },
]


def seed(cursor):
    print("→ Seeding course_package...")
    cursor.execute("SELECT id, name FROM course LIMIT 50")
    courses = cursor.fetchall()

    if not courses:
        print("   [warning] Bảng course chưa có dữ liệu, bỏ qua seed course_package")
        return

    inserted_count = 0
    for course in courses:
        course_id = course["id"]
        course_name = course["name"]

        # Kiểm tra xem khóa học này đã có gói học nào chưa
        cursor.execute("SELECT COUNT(*) as cnt FROM course_package WHERE course_id = %s", (course_id,))
        if cursor.fetchone()["cnt"] > 0:
            continue

        base_price = random.choice([2500000, 3500000, 4500000, 5500000, 6500000])

        # Sinh 2-3 gói học cho mỗi khóa học
        chosen_templates = random.sample(PACKAGE_TEMPLATES, k=random.randint(2, 3))
        for tpl in chosen_templates:
            pkg_id = snowflake.next_id()
            selling_price = int(base_price * tpl["price_factor"])
            original_price = int(selling_price * 1.25)
            status = random.choice(["ACTIVE", "ACTIVE", "ACTIVE", "INACTIVE"])

            cursor.execute(
                """
                INSERT INTO course_package (
                    id, course_id, name, description, delivery_mode,
                    price, original_price, duration_days, included_tutor_sessions,
                    max_group_size, status, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (
                    pkg_id,
                    course_id,
                    f"{tpl['name']} - {course_name[:30]}",
                    tpl["description"],
                    tpl["delivery_mode"],
                    selling_price,
                    original_price,
                    tpl["duration_days"],
                    tpl["included_tutor_sessions"],
                    tpl["max_group_size"],
                    status,
                ),
            )
            inserted_count += 1

    print(f"   [insert] Đã tạo thành công {inserted_count} gói học trong `course_package`")
