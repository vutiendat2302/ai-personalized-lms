"""
seed_student_interests.py
--------------------------
Seed dữ liệu cho bảng `student_interest` (Quan hệ nhiều-nhiều Học viên - Sở thích).
- Khóa chính là khóa phức hợp: (student_user_id, interest_id) -> Không dùng Snowflake ID.
- Phân bổ số lượng sở thích/học viên: 80% có 5 sở thích, 10% có 4 sở thích, 10% có 3 sở thích.
- created_by: Lấy chính user_id của học viên (Học viên tự thiết lập sở thích).
- updated_by: NULL.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime
# Không cần import snowflake vì bảng này dùng @EmbeddedId (khóa phức hợp)

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

# Các câu ghi chú mục tiêu phát triển thực tế theo sở thích
NOTE_SAMPLES = [
    "Muốn tìm hiểu sâu hơn về lĩnh vực này để ứng dụng vào các dự án thực tế trong tương lai.",
    "Đam mê từ lâu, mục tiêu hoàn thành các khóa học nâng cao và lấy chứng chỉ chuyên môn.",
    "Cần bổ sung kiến thức nền tảng để hỗ trợ tốt cho lộ trình học tập và định hướng nghề nghiệp.",
    "Sở thích cá nhân giúp rèn luyện tư duy logic, giải tỏa căng thẳng ngoài giờ học chính.",
    "Muốn tham gia các nhóm thảo luận và làm bài tập thực hành chuyên sâu về chủ đề này.",
    "Định hướng phát triển kỹ năng này thành thế mạnh core-competency khi đi làm.",
    None,  # 30% sẽ không ghi chú gì cho tự nhiên
    None
]


def get_all_student_ids(cursor):
    """Lấy danh sách toàn bộ user_id từ bảng student_profile."""
    cursor.execute("SELECT user_id FROM student_profile")
    # Sắp xếp để cố định dữ liệu khi random
    return sorted([row["user_id"] for row in cursor.fetchall()])


def get_all_interests(cursor):
    """Lấy danh sách id và tên sở thích từ bảng interest."""
    # Giả định bảng interest có cột id và name (hoặc title)
    try:
        cursor.execute("SELECT id, name FROM interest")
    except Exception:
        # Fallback nếu cột tên trong DB của m là title hay interest_name
        cursor.execute("SELECT id FROM interest")
    return cursor.fetchall()

def check_student_has_interests(cursor, student_user_id: int):
    """
    ---> CHỐT CHẶN MỚI <---
    Kiểm tra xem học viên này ĐÃ CÓ sở thích nào trong DB chưa.
    Nếu có rồi thì bỏ qua luôn, không bao giờ bị đẻ thêm record nữa!
    """
    # Lưu ý: Nếu tên bảng trong DB của m là số nhiều (student_interests), hãy thêm chữ s vào tên bảng bên dưới
    query = "SELECT 1 FROM student_interest WHERE student_user_id = %s LIMIT 1"
    try:
        cursor.execute(query, (student_user_id,))
    except Exception:
        # Fallback tự động nếu tên bảng trong DB của m là số nhiều
        cursor.execute("SELECT 1 FROM student_interests WHERE student_user_id = %s LIMIT 1", (student_user_id,))
    return cursor.fetchone() is not None


def check_interest_exists(cursor, student_user_id: int, interest_id: int):
    """Kiểm tra xem cặp (student_user_id, interest_id) đã tồn tại chưa (Idempotent)."""
    query = """
        SELECT student_user_id 
        FROM student_interest 
        WHERE student_user_id = %s AND interest_id = %s 
        LIMIT 1
    """
    cursor.execute(query, (student_user_id, interest_id))
    row = cursor.fetchone()
    return row["student_user_id"] if row else None


def seed(cursor):
    print("→ Seeding student_interests (Sở thích học viên)...")

    # 1. Lấy danh sách học viên
    students = get_all_student_ids(cursor)
    if not students:
        print("   [warning] Bảng `student_profile` đang trống! Hãy chạy seed_student_profiles trước.")
        return

    # 2. Lấy danh sách sở thích
    interests = list(get_all_interests(cursor))
    if not interests:
        print("   [warning] Bảng `interest` đang trống! Hãy chắc chắn đã chạy seed cho bảng `interest`.")
        return

    total_interests_available = len(interests)
    print(f"   [info] Có {len(students)} học viên và {total_interests_available} sở thích trong hệ thống.")

    # 3. Mảng tỉ lệ số lượng sở thích cho mỗi học viên (10 phần tử):
    # 80% có 5 sở thích, 10% có 4 sở thích, 10% có 3 sở thích
    count_pool = [5] * 8 + [4] * 1 + [3] * 1

    total_inserted = 0
    total_skipped = 0

    # 4. Lặp qua từng học viên để gán sở thích
    for student_id in students:
        # ---> KIỂM TRA CHỐT CHẶN <---
        # Nếu học viên đã được seed sở thích từ lần chạy trước -> SKIP NGAY!
        if check_student_has_interests(cursor, student_id):
            total_skipped += 1
            continue
        
        # Chọn số lượng sở thích học viên này sẽ có (3, 4 hoặc 5)
        desired_count = random.choice(count_pool)
        
        # Nếu DB có ít hơn desired_count sở thích thì lấy tối đa số sở thích hiện có
        actual_count = min(desired_count, total_interests_available)
        
        # Bốc ngẫu nhiên actual_count sở thích KHÔNG TRÙNG LẶP cho học viên này
        selected_interests = random.sample(interests, actual_count)

        for item in selected_interests:
            interest_id = item["id"]
            interest_name = item.get("name", f"ID:{interest_id}")

            # Check idempotent theo cặp khóa phức hợp
            if check_interest_exists(cursor, student_id, interest_id):
                total_skipped += 1
                continue

            note = random.choice(NOTE_SAMPLES)
            now = datetime.now()

            # 5. Insert vào bảng student_interest
            # created_by lấy chính student_id theo đúng yêu cầu
            cursor.execute(
                """
                INSERT INTO student_interest (
                    student_user_id, interest_id, note, 
                    created_by, updated_by, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    student_id,
                    interest_id,
                    note,
                    student_id,  # ---> created_by = user_id của học viên
                    None,        # ---> updated_by = NULL
                    now,         # ---> created_at
                    now,         # ---> updated_at
                ),
            )
            total_inserted += 1
            print(f"   [insert] Student ID: {student_id} | Interest: {str(interest_name):<20} | Note: {'Yes' if note else 'No'}")

    print(f"   [completed] Đã seed xong student_interest! Inserted: {total_inserted} | Skipped: {total_skipped}.")