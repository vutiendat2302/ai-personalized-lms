"""
seed_course_sections.py
------------------------
Seed dữ liệu cho bảng `course_section` (Chương học trong khóa học).
- course_id & created_by: Lấy trực tiếp từ bảng `course` (Giảng viên của khóa sẽ là người tạo chương).
- Số lượng chương: 3 -> 6 chương mỗi khóa học.
- order_index: Tăng dần 1, 2, 3... cho mỗi chương.
- Tên chương: Sinh theo kịch bản lộ trình học tập thực chiến (Từ cơ bản đến dự án thực tế).
- status: 95% ACTIVE, 5% INACTIVE.
- Tối ưu hiệu năng: Gom batch 1000 records insert 1 lần siêu nhanh.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime, timedelta
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

# Tỉ lệ Status: 95% ACTIVE, 5% INACTIVE
STATUS_POOL = ["ACTIVE"] * 95 + ["INACTIVE"] * 5

# Kịch bản tên chương theo thứ tự lộ trình học tập (Index 1 -> 6)
SECTION_TEMPLATES = {
    1: [
        "Chương 1: Giới thiệu tổng quan & Cài đặt môi trường",
        "Chương 1: Khởi đầu lộ trình & Các khái niệm nhập môn",
        "Chương 1: Tổng quan khóa học & Chuẩn bị công cụ làm việc",
        "Chương 1: Bước đầu làm quen với công nghệ & Tư duy nền tảng"
    ],
    2: [
        "Chương 2: Kiến thức nền tảng & Các cú pháp cốt lõi",
        "Chương 2: Xây dựng nền tảng vững chắc & Thực hành cơ bản",
        "Chương 2: Các cấu trúc dữ liệu & Thành phần quan trọng",
        "Chương 2: Nguyên lý hoạt động & Kiến trúc hệ thống cơ bản"
    ],
    3: [
        "Chương 3: Kỹ năng chuyên sâu & Xử lý nghiệp vụ thực tế",
        "Chương 3: Các kỹ thuật nâng cao & Best Practices",
        "Chương 3: Tối ưu quy trình làm việc & Xử lý lỗi thường gặp",
        "Chương 3: Kết nối cơ sở dữ liệu & Tích hợp hệ thống"
    ],
    4: [
        "Chương 4: Thực hành xây dựng Dự án thực chiến (Phần 1)",
        "Chương 4: Phân tích yêu cầu & Thiết kế kiến trúc dự án",
        "Chương 4: Triển khai tính năng cốt lõi cho ứng dụng thực tế",
        "Chương 4: Xây dựng Module quản lý & Xử lý logic nghiệp vụ"
    ],
    5: [
        "Chương 5: Hoàn thiện Dự án thực chiến (Phần 2) & Tối ưu hóa",
        "Chương 5: Tối ưu hiệu năng, Bảo mật & Kiểm thử ứng dụng",
        "Chương 5: Đóng gói dự án & Chuẩn bị triển khai (Deployment)",
        "Chương 5: Phân tích & Viết unit test cho các module quan trọng"
    ],
    6: [
        "Chương 6: Tổng kết khóa học, Đánh giá & Chuẩn bị phỏng vấn",
        "Chương 6: Định hướng phát triển nghề nghiệp & Kỹ năng viết CV",
        "Chương 6: Bàn giao mã nguồn dự án & Chia sẻ tài liệu nâng cao",
        "Chương 6: Ôn tập tổng hợp & Hướng dẫn làm bài kiểm tra cuối khóa"
    ]
}


def get_all_courses(cursor):
    """Lấy danh sách id, created_by và created_at từ bảng course."""
    query = "SELECT id, created_by, created_at FROM course"
    cursor.execute(query)
    # Sắp xếp theo ID để đảm bảo cố định thứ tự khi random
    return sorted(cursor.fetchall(), key=lambda x: x["id"])


def get_current_section_count(cursor):
    """Kiểm tra số lượng chương học hiện có trong DB."""
    try:
        cursor.execute("SELECT COUNT(*) as total FROM course_section")
        row = cursor.fetchone()
        return row["total"] if row else 0
    except Exception:
        return 0


def seed(cursor):
    print("→ Seeding course_sections (Chương học cho ~3000 khóa học)...")

    # 1. Kiểm tra nếu DB đã có dữ liệu thì skip
    current_count = get_current_section_count(cursor)
    if current_count >= 5000:
        print(f"   [skip] DB đã có sẵn {current_count} chương học. Bỏ qua seed course_section.")
        return

    # 2. Lấy danh sách khóa học
    courses = get_all_courses(cursor)
    if not courses:
        print("   [warning] Bảng `course` đang trống! Hãy chạy seed_courses trước.")
        return

    total_courses = len(courses)
    print(f"   [info] Tìm thấy {total_courses} khóa học. Đang sinh các chương học...")

    batch_data = []
    total_inserted = 0
    now = datetime.now()

    # 3. Lặp qua từng khóa học để sinh từ 3 -> 6 chương
    for idx, course in enumerate(courses):
        course_id = course["id"]
        teacher_id = course["created_by"]
        course_created_at = course["created_at"] if course["created_at"] else now

        # Mỗi khóa học có từ 3 đến 6 chương
        num_sections = random.randint(3, 6)

        for order_idx in range(1, num_sections + 1):
            # Chọn tên chương phù hợp với thứ tự (order_idx)
            # Nếu vượt quá 6 chương (fallback) thì dùng template số 6
            template_list = SECTION_TEMPLATES.get(order_idx, SECTION_TEMPLATES[6])
            section_name = random.choice(template_list)
            
            status = random.choice(STATUS_POOL)

            # Thời điểm tạo chương nằm sau thời điểm tạo khóa học vài giờ/ngày
            created_at = course_created_at + timedelta(hours=random.randint(1, 48), minutes=order_idx * 15)
            if created_at > now:
                created_at = now

            new_id = snowflake.next_id()

            # Đẩy vào mảng batch
            batch_data.append((
                new_id,
                course_id,
                section_name[:100],  # Cắt bảo vệ max length 100 của cột name
                order_idx,
                status,
                teacher_id,          # created_by = Giảng viên của khóa học
                None,                # updated_by
                created_at,
                created_at
            ))

            # Khi gom đủ 1000 records thì insert 1 lần cho siêu nhanh
            if len(batch_data) >= 1000:
                cursor.executemany(
                    """
                    INSERT INTO course_section (
                        id, course_id, name, order_index, status, 
                        created_by, updated_by, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    batch_data
                )
                total_inserted += len(batch_data)
                batch_data.clear()

        # In log tiến độ mỗi 500 khóa học
        if (idx + 1) % 500 == 0 or (idx + 1) == total_courses:
            print(f"   [progress] Đã xử lý {idx + 1}/{total_courses} khóa học (Total sections: {total_inserted + len(batch_data)})...")

    # 4. Insert nốt số records còn dư trong batch cuối cùng
    if batch_data:
        cursor.executemany(
            """
            INSERT INTO course_section (
                id, course_id, name, order_index, status, 
                created_by, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            batch_data
        )
        total_inserted += len(batch_data)
        batch_data.clear()

    print(f"   [completed] Hoàn tất seed course_section! Tổng số chương học đã insert: {total_inserted}.")