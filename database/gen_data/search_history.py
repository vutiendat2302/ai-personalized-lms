"""
search_history.py
--------------
Seed dữ liệu cho bảng `search_history`.
- Sinh từ 20 đến 30 từ khóa tìm kiếm cho mỗi User.
- Dữ liệu keyword được custom theo Role (STUDENT, TEACHER, TA, HR).
- Bỏ qua ADMIN.
- Kiểm tra idempotent: Nếu user đã có lịch sử tìm kiếm thì bỏ qua để không sinh rác.
"""

import random
from snowflake_id import snowflake

# --- BỘ TỪ KHÓA THỰC TẾ THEO TỪNG NGHIỆP VỤ ---

STUDENT_KEYWORDS = [
    "Khóa học Python cơ bản", "Roadmap Data Engineering", "Apache Spark cho người mới bắt đầu",
    "Lập trình Hadoop thực chiến", "Ứng dụng Graph Neural Networks (GNN)", "Khóa học Machine Learning",
    "Luyện thi TOEIC 750", "Tài liệu luyện thi IELTS 6.5", "Tối ưu code PySpark",
    "Học phí khóa Data Science", "Lịch học tuần này", "Bài tập thực hành K-Means và DBSCAN",
    "Hướng dẫn cài đặt Docker trên Ubuntu", "Fix lỗi Docker Compose", "Viết Bash script tự động hóa",
    "Giải bài tập Toán rời rạc", "Tài liệu C++ nâng cao", "Lộ trình học Frontend",
    "Khóa học Backend Node.js", "Xin nghỉ phép ốm", "Chứng chỉ hoàn thành khóa học",
    "Cách xem điểm thi giữa kỳ", "Review khóa học AI", "Tài liệu cấu trúc dữ liệu và giải thuật"
]

TEACHER_KEYWORDS = [
    "Tạo khóa học mới", "Quản lý danh sách sinh viên", "Chấm điểm bài tập lập trình",
    "Upload video bài giảng", "Cập nhật slide PDF", "Thống kê điểm số lớp học",
    "Báo cáo tiến độ học tập", "Chỉnh sửa câu hỏi trắc nghiệm", "Lên lịch live stream",
    "Phản hồi đánh giá của học viên", "Tạo bài tập lớn (Assignment)", "Theo dõi chuyên cần",
    "Hướng dẫn làm đồ án cuối khóa", "Cấu hình bài thi Quiz", "Export bảng điểm Excel"
]

TA_KEYWORDS = [
    "Chấm điểm trắc nghiệm", "Hỗ trợ học viên làm bài tập", "Danh sách sinh viên nộp trễ",
    "Giải đáp thắc mắc lập trình", "Điểm danh lớp thực hành", "Cập nhật điểm giữa kỳ",
    "Hướng dẫn cài đặt môi trường code", "Báo cáo tình hình học tập lớp", "Nhắc nhở nộp bài",
    "Tổng hợp câu hỏi của học viên", "Hỗ trợ chấm bài tự luận", "Lịch trực trợ giảng"
]

HR_KEYWORDS = [
    "Hợp đồng lao động giảng viên", "Bảng lương tháng này", "Tính công và chuyên cần nhân viên",
    "Danh sách nhân sự mới", "Đăng tin tuyển dụng trợ giảng", "Đánh giá KPI giảng viên",
    "Quyết toán thuế TNCN", "Đơn xin nghỉ phép của nhân sự", "Hồ sơ ứng viên TA",
    "Thêm phòng ban mới", "Thống kê giờ giảng dạy", "Phụ cấp giảng viên ngoài giờ"
]

def get_users_and_roles(cursor):
    """
    Lấy danh sách user và role cao nhất của họ (Bỏ qua ADMIN).
    """
    # Lấy thông tin role của user, ưu tiên sắp xếp để loại ADMIN và lấy role nghiệp vụ chính
    cursor.execute("""
        SELECT u.id AS user_id, r.code AS role_code
        FROM user u
        JOIN user_role ur ON u.id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code != 'ADMIN'
    """)
    rows = cursor.fetchall()
    
    # Một user có thể có nhiều role, gộp lại và ưu tiên lấy 1 role chính để sinh data
    user_roles = {}
    for row in rows:
        uid = row["user_id"]
        code = row["role_code"]
        if uid not in user_roles:
            user_roles[uid] = code
        else:
            # Nếu đã có, ưu tiên các role nghiệp vụ (HR > TEACHER > TA > STUDENT)
            priority = {"HR": 4, "TEACHER": 3, "TA": 2, "STUDENT": 1}
            current_prio = priority.get(user_roles[uid], 0)
            new_prio = priority.get(code, 0)
            if new_prio > current_prio:
                user_roles[uid] = code
                
    return user_roles

def check_user_has_history(cursor, user_id: int):
    """Kiểm tra xem user này đã có lịch sử tìm kiếm chưa (Idempotent)."""
    cursor.execute("SELECT id FROM search_history WHERE user_id = %s LIMIT 1", (user_id,))
    return cursor.fetchone() is not None

def seed(cursor):
    """Insert dữ liệu search_history."""
    print("→ Seeding search history...")
    
    user_roles = get_users_and_roles(cursor)
    if not user_roles:
        print("   [warn] Không tìm thấy user nào hợp lệ (không phải ADMIN) để sinh lịch sử tìm kiếm.")
        return
        
    total_inserted = 0
    users_seeded = 0

    for user_id, role_code in user_roles.items():
        if check_user_has_history(cursor, user_id):
            continue  # Bỏ qua nếu user đã có lịch sử tìm kiếm

        # Chọn bộ keyword tương ứng với Role
        if role_code == "HR":
            pool = HR_KEYWORDS
        elif role_code == "TEACHER":
            pool = TEACHER_KEYWORDS
        elif role_code == "TA":
            pool = TA_KEYWORDS
        else:
            pool = STUDENT_KEYWORDS

        # Sinh ngẫu nhiên từ 20 đến 30 lượt tìm kiếm cho user này
        num_searches = random.randint(20, 30)
        
        # Vì bộ keyword có hạn, ta cho phép lặp lại (dùng random.choices) 
        # và thỉnh thoảng nối thêm chữ để tạo sự khác biệt
        selected_keywords = random.choices(pool, k=num_searches)
        
        for kw in selected_keywords:
            # Random thêm các biến thể cho thật (ví dụ: gõ chữ thường, gõ thiếu dấu)
            keyword_variant = kw
            chance = random.random()
            if chance < 0.2:
                keyword_variant = keyword_variant.lower()
            elif chance < 0.3:
                keyword_variant = "tìm " + keyword_variant.lower()
            elif chance < 0.4:
                keyword_variant = "cách " + keyword_variant.lower()

            new_id = snowflake.next_id()
            
            cursor.execute(
                """
                INSERT INTO search_history (
                    id, user_id, keyword, created_at, updated_at
                )
                VALUES (%s, %s, %s, NOW(), NOW())
                """,
                (new_id, user_id, keyword_variant[:255])
            )
            total_inserted += 1
            
        users_seeded += 1

    print(f"   Đã thêm mới {total_inserted} lịch sử tìm kiếm cho {users_seeded} users.")