"""
seed_courses.py
----------------
Seed dữ liệu cho bảng `course` (Khóa học).
- Sinh khoảng 3000 khóa học thực tế.
- category_id & created_by: Query từ bảng `teacher_category` JOIN `category` 
  để đảm bảo giảng viên chỉ tạo khóa học đúng chuyên môn được gán.
- Tên & Slug (link): Sinh tự động bằng tổ hợp từ vựng + Slugify chuẩn VN, đảm bảo UNIQUE 100%.
- Tỉ lệ status: 90% ACTIVE, còn lại DRAFT, PENDING, REJECTED, INACTIVE.
- Giá bán: 200,000 -> 4,950,000 VNĐ.
- Cố định seed 100% (random.seed(42)).
"""

import random
import re
import unicodedata
from datetime import datetime, timedelta
from decimal import Decimal
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

# Tỉ lệ Status: 90% ACTIVE, 2.5% DRAFT, 2.5% PENDING, 2.5% REJECTED, 2.5% INACTIVE
STATUS_POOL = (
    ["ACTIVE"] * 90 
    + ["DRAFT"] * 2 
    + ["PENDING"] * 3 
    + ["REJECTED"] * 3 
    + ["INACTIVE"] * 2
)

# Tỉ lệ Level: 50% BEGINNER, 35% INTERMEDIATE, 15% ADVANCED
LEVEL_POOL = (
    ["BEGINNER"] * 50 + ["INTERMEDIATE"] * 35 + ["ADVANCED"] * 15
)

# Tỉ lệ Điều kiện chứng chỉ: 60% COMPLETION_RATE, 40% FINAL_EXAM_PASS
CERT_CONDITION_POOL = (
    ["COMPLETION_RATE"] * 60 + ["FINAL_EXAM_PASS"] * 40
)

# --- BỘ TỪ ĐIỂN TỔ HỢP TÊN KHÓA HỌC THỰC TẾ ---
PREFIXES = [
    "Làm chủ", "Toàn tập", "Khóa học thực chiến", "Chuyên sâu", 
    "Lộ trình chuẩn", "Nhập môn", "Tối ưu hóa & Nâng cao", "Masterclass:", 
    "Kỹ năng cốt lõi", "Ứng dụng thực tế", "Xây dựng dự án với", "Bí quyết thạc sĩ:"
]

SUFFIXES = [
    "từ A-Z", "cho người mới bắt đầu", "thực chiến năm 2026", "chuyên nghiệp", 
    "qua các dự án thực tế", "cấp tốc trong 30 ngày", "nâng cao dành cho người đi làm", 
    "toàn diện nhất", "đạt chuẩn doanh nghiệp", "với chuyên gia hàng đầu"
]

REJECTION_REASONS = [
    "Nội dung video giới thiệu chưa đạt chất lượng âm thanh/hình ảnh tối thiểu.",
    "Mô tả khóa học quá sơ sài, thiếu mục tiêu đầu ra cho học viên.",
    "Chưa có đủ số lượng bài học (tối thiểu 5 bài cho một khóa học tiêu chuẩn).",
    "Giá bán đề xuất chưa phù hợp với thời lượng và mức độ chuyên sâu của nội dung.",
    "Vi phạm bản quyền hình ảnh hoặc tiêu đề khóa học gây hiểu lầm."
]


def slugify(text: str, suffix: str = "") -> str:
    """
    Chuyển chuỗi tiếng Việt thành slug chuẩn URL (VD: 'Làm chủ Java' -> 'lam-chu-java').
    Gán thêm suffix để đảm bảo tuyệt đối không trùng lặp.
    """
    # Xóa dấu tiếng Việt
    text = unicodedata.normalize('NFKD', text)
    text = "".join([c for c in text if not unicodedata.combining(c)])
    # Chuyển chữ thường, thay ký tự đặc biệt bằng dấu gạch nối
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return f"{text}-{suffix}" if suffix else text


def get_valid_teacher_categories(cursor):
    """
    Lấy danh sách các cặp (employee_id, category_id, category_name) hợp lệ từ DB.
    Chỉ lấy các phân công đang ACTIVE.
    """
    query = """
        SELECT tc.employee_id, tc.category_id, c.name as category_name
        FROM teacher_category tc
        JOIN category c ON tc.category_id = c.id
        WHERE tc.status = 'ACTIVE' AND tc.unassigned_at IS NULL
    """
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        return [(r["employee_id"], r["category_id"], r["category_name"]) for r in rows]
    except Exception as e:
        print(f"   [error] Lỗi khi query teacher_category: {e}")
        return []


def get_current_course_count(cursor):
    """Kiểm tra số lượng khóa học hiện có trong DB."""
    try:
        cursor.execute("SELECT COUNT(*) as total FROM course")
        row = cursor.fetchone()
        return row["total"] if row else 0
    except Exception:
        return 0


def seed(cursor):
    print("→ Seeding courses (~3000 khóa học từ chuyên môn giảng viên)...")

    # 1. Kiểm tra nếu DB đã có nhiều khóa học thì skip để tránh chạy lâu
    current_count = get_current_course_count(cursor)
    if current_count >= 2800:
        print(f"   [skip] DB đã có sẵn {current_count} khóa học. Bỏ qua seed course.")
        return

    # 2. Lấy danh sách chuyên môn giảng viên hợp lệ
    tc_list = get_valid_teacher_categories(cursor)
    if not tc_list:
        print("   [warning] Không tìm thấy dữ liệu trong bảng `teacher_category` hoặc `category`! Hãy chạy seed các bảng đó trước.")
        return

    print(f"   [info] Tìm thấy {len(tc_list)} cặp (Giảng viên - Chuyên môn) hợp lệ. Đang tiến hành sinh 3000 khóa học...")

    target_courses = 3000 - current_count
    total_inserted = 0
    
    # 3. Vòng lặp sinh dữ liệu khóa học
    for i in range(1, target_courses + 1):
        # Bốc ngẫu nhiên 1 cặp (Giảng viên, Chuyên môn)
        emp_id, cat_id, cat_name = random.choice(tc_list)

        # Sinh tên khóa học tự nhiên không trùng lặp
        prefix = random.choice(PREFIXES)
        suffix = random.choice(SUFFIXES)
        course_name = f"{prefix} {cat_name} {suffix} #{i}"
        
        # Sinh slug URL duy nhất (kèm index i để chống trùng 100%)
        link_slug = slugify(f"{prefix} {cat_name} {suffix}", suffix=f"{i}-{random.randint(100, 999)}")

        # Sinh mô tả chi tiết
        description = (
            f"Khóa học '{course_name}' được thiết kế chuyên sâu dành cho học viên mong muốn "
            f"nắm vững kiến thức về {cat_name}. Nội dung bám sát thực tế, đi từ lý thuyết nền tảng "
            f"đến xây dựng dự án thực chiến. Giảng viên đồng hành giải đáp thắc mắc 24/7."
        )

        # Giá gợi ý: Từ 200k đến 4.95 triệu (bước nhảy 50k)
        suggested_price = Decimal(random.randrange(200, 5000, 50)) * Decimal(1000)

        level = random.choice(LEVEL_POOL)
        status = random.choice(STATUS_POOL)
        cert_type = random.choice(CERT_CONDITION_POOL)
        
        # Ngưỡng chứng chỉ: 70%, 75%, 80%, hoặc 85%
        cert_threshold = random.choice([70, 75, 80, 85])

        # Xử lý Rating & Review logic theo Status
        if status == "ACTIVE":
            # Khóa học ACTIVE sẽ có rating từ 3.8 đến 5.0 và có lượt review
            avg_rating = round(random.uniform(3.8, 5.0), 1)
            review_count = random.randint(10, 500)
            rejection_reason = None
        elif status == "REJECTED":
            avg_rating = 0.0
            review_count = 0
            rejection_reason = random.choice(REJECTION_REASONS)
        else:  # DRAFT, PENDING, INACTIVE
            avg_rating = 0.0
            review_count = 0
            rejection_reason = None

        # Thời điểm tạo trong vòng 2 năm qua
        days_ago = random.randint(10, 700)
        created_at = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
        
        # Nếu đã ACTIVE thì có updated_at gần đây hơn
        updated_at = created_at + timedelta(days=random.randint(1, days_ago)) if days_ago > 1 else created_at

        new_id = snowflake.next_id()

        # 4. Insert vào DB
        cursor.execute(
            """
            INSERT INTO course (
                id, category_id, name, link, description, 
                suggested_price, level, status, rejection_reason, 
                avg_rating, review_count, certificate_condition_type, certificate_pass_threshold, 
                created_by, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                new_id,
                cat_id,
                course_name[:100],  # Cắt bảo vệ max length 100 của name
                link_slug[:255],    # Cắt bảo vệ max length 255 của link
                description,
                suggested_price,
                level,
                status,
                rejection_reason,
                avg_rating,
                review_count,
                cert_type,
                cert_threshold,
                emp_id,     # ---> created_by = ID Giảng viên thuộc chuyên môn đó
                emp_id if status == "ACTIVE" else None,  # updated_by
                created_at,
                updated_at
            ),
        )
        total_inserted += 1

        # In log tiến độ mỗi 500 bản ghi cho đỡ rác terminal
        if total_inserted % 500 == 0 or total_inserted == target_courses:
            print(f"   [progress] Đã tạo {total_inserted}/{target_courses} khóa học...")

    print(f"   [completed] Hoàn tất seed course! Tổng số khóa học đã insert: {total_inserted}.")