"""
seed_student_profiles.py
-------------------------
Seed dữ liệu cho bảng `student_profile` (Hồ sơ học viên).
- Khóa chính `user_id` liên kết 1-1 với `user`.
- Chỉ lấy user mang role: STUDENT.
- student_code format: ST-{MMYY}-{6 chữ/số ngẫu nhiên, không ký tự đặc biệt}.
- Tỉ lệ is_minor: 60% True (< 18 tuổi), 40% False (>= 18 tuổi).
- Dữ liệu trình độ, trường học và mục tiêu học tập bám sát thực tế theo is_minor.
- Cố định seed 100% (random.seed(42)).
"""

import random
import string
from datetime import datetime
from faker import Faker
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
Faker.seed(42)
random.seed(42)
# -----------------------------------------

fake = Faker("vi_VN")

# Danh sách trường học và mục tiêu mẫu cực kỳ thực tế theo độ tuổi
MINOR_SCHOOLS = [
    "THCS Lê Văn Thiêm", "THCS Giảng Võ", "THPT Chuyên Hà Nội - Amsterdam",
    "THPT Chu Văn An", "THPT Phan Đình Phùng", "THCS Nguyễn Trường Tộ",
    "THPT Chuyên Sư Phạm", "THPT Lương Thế Vinh", "THCS & THPT Nguyễn Tất Thành",
    "Trường Quốc tế BVIS Hà Nội", "THCS Trưng Vương", "THPT Kim Liên"
]

ADULT_SCHOOLS = [
    "Đại học Khoa học Tự nhiên - VNU", "Đại học Bách Khoa Hà Nội",
    "Đại học Công nghệ - VNU", "Đại học Kinh tế Quốc dân",
    "Đại học Ngoại thương", "Học viện Bưu chính Viễn thông",
    "Đại học FPT", "Học viện Ngân hàng", "Công ty Cổ phần Phần mềm (Người đi làm)",
    "Đại học Sư phạm Hà Nội", "Đại học Quốc gia TP.HCM"
]

MINOR_GOALS = [
    "Cải thiện điểm số trên lớp, đặt mục tiêu đạt học sinh giỏi năm nay.",
    "Ôn thi chuyển cấp vào trường THPT Chuyên, tập trung môn Toán và Khoa học.",
    "Luyện thi IELTS sớm đạt 6.5+ trước khi tốt nghiệp cấp 3.",
    "Nắm vững kiến thức nền tảng, chuẩn bị tốt cho kỳ thi THPT Quốc gia.",
    "Phát triển tư duy logic và giải quyết bài tập nâng cao chuẩn bị cho kỳ thi HSG."
]

ADULT_GOALS = [
    "Luyện thi IELTS 7.5+ / TOEIC 850+ để chuẩn bị hồ sơ thực tập và tốt nghiệp.",
    "Học kỹ năng lập trình Data Engineering / Machine Learning phục vụ công việc mới.",
    "Nâng cao kiến thức chuyên môn, lấy chứng chỉ nghề nghiệp để thăng tiến sự nghiệp.",
    "Tự học kỹ năng mới ngoài giờ làm việc để chuyển hướng nghề nghiệp (Career Transition).",
    "Nghiên cứu kiến thức chuyên sâu phục vụ cho các dự án thực tế tại công ty."
]

DESCRIPTIONS = [
    "Học viên chăm chỉ, có tinh thần tự học cao và luôn hoàn thành bài tập đúng hạn.",
    "Thích học qua video trực quan và làm các bài tập thực hành dự án thực tế.",
    "Cần được hướng dẫn lộ trình học tập rõ ràng, bài bản từ cơ bản đến nâng cao.",
    "Năng nổ tham gia thảo luận, thường xuyên đặt câu hỏi để tìm hiểu sâu vấn đề.",
    "Học viên có nền tảng tư duy tốt, muốn thử thách với các bài tập độ khó cao."
]


def get_admin_id(cursor):
    """Lấy ID của Admin để gán vào created_by."""
    query = """
        SELECT u.id 
        FROM user u
        JOIN user_role ur ON u.id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code = 'ADMIN'
        LIMIT 1
    """
    cursor.execute(query)
    row = cursor.fetchone()
    return row["id"] if row else None


def get_student_users(cursor):
    """Lấy danh sách user_id của những tài khoản mang role STUDENT."""
    query = """
        SELECT DISTINCT u.id 
        FROM user u
        JOIN user_role ur ON u.id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code = 'STUDENT'
    """
    cursor.execute(query)
    # Sắp xếp theo ID để cố định dữ liệu khi random
    return sorted([row["id"] for row in cursor.fetchall()])


def check_profile_exists(cursor, user_id: int):
    """Kiểm tra xem học viên này đã có profile chưa (Idempotent theo user_id)."""
    cursor.execute("SELECT user_id FROM student_profile WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    return row["user_id"] if row else None


def generate_student_code():
    """
    Sinh mã học viên dạng ST-{MMYY}-{Random 6 ký tự}.
    Chỉ sử dụng chữ cái in hoa (A-Z) và số (0-9), loại bỏ hoàn toàn ký tự đặc biệt.
    """
    mmyy = datetime.now().strftime("%m%y")
    # string.ascii_uppercase + string.digits đảm bảo chỉ có A-Z, 0-9
    random_chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"ST-{mmyy}-{random_chars}"


def seed(cursor):
    print("→ Seeding student_profiles (Hồ sơ học viên)...")

    # 1. Lấy ID Admin
    admin_id = get_admin_id(cursor)
    if not admin_id:
        print("   [warning] Không tìm thấy user ADMIN! Tạm để NULL cho created_by.")
        admin_id = None

    # 2. Lấy danh sách user mang role STUDENT
    students = get_student_users(cursor)
    if not students:
        print("   [warning] Không tìm thấy user nào có role STUDENT trong bảng user_role!")
        return

    total_students = len(students)
    print(f"   [info] Tìm thấy {total_students} tài khoản STUDENT để tạo hồ sơ.")

    # 3. Phân bổ tỉ lệ is_minor: 60% True, 40% False
    minor_count = int(total_students * 0.60)
    adult_count = total_students - minor_count
    
    is_minor_pool = [True] * minor_count + [False] * adult_count
    random.shuffle(is_minor_pool)

    total_inserted = 0
    total_skipped = 0

    # 4. Lặp qua danh sách học viên và insert vào DB
    for idx, user_id in enumerate(students):
        # Check idempotent
        if check_profile_exists(cursor, user_id):
            total_skipped += 1
            continue

        is_minor = is_minor_pool[idx]
        student_code = generate_student_code()
        
        # 85% học viên sẽ có has_goal = True (đã thiết lập mục tiêu)
        has_goal = random.random() < 0.85
        description = random.choice(DESCRIPTIONS)

        # Xử lý thông tin học vấn và trường học logic theo độ tuổi
        if is_minor:
            education_level = random.choice(["Tiểu học", "THCS", "THPT"])
            school_name = random.choice(MINOR_SCHOOLS)
            goal = random.choice(MINOR_GOALS) if has_goal else None
        else:
            education_level = random.choice(["Đại học", "Người đi làm", "Sau Đại học"])
            school_name = random.choice(ADULT_SCHOOLS)
            goal = random.choice(ADULT_GOALS) if has_goal else None

        now = datetime.now()

        # Insert vào bảng student_profile (Bao gồm đầy đủ auditing BaseEntity)
        cursor.execute(
            """
            INSERT INTO student_profile (
                user_id, student_code, education_level, description, goal, 
                school_name, has_goal, is_minor, 
                created_by, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                student_code,
                education_level,
                description,
                goal,
                school_name,
                has_goal,
                is_minor,
                admin_id,  # created_by
                None,      # updated_by
                now,       # created_at
                now,       # updated_at
            ),
        )
        total_inserted += 1
        
        age_label = "Minor (<18)" if is_minor else "Adult (>=18)"
        print(f"   [insert] {student_code:<15} | {age_label:<13} | {education_level:<13} | UID: {user_id}")

    print(f"   [completed] Đã seed xong student_profile! Inserted: {total_inserted} | Skipped: {total_skipped}.")