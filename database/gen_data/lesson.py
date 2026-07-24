"""
lesson.py
--------------
Seed dữ liệu cho bảng `lesson`.
- Tự động lấy tên Section từ DB để sinh tên Lesson ăn khớp với ngữ cảnh.
- Mỗi Course chỉ cho phép 1-2 bài đầu tiên là FREE, còn lại LOCKED.
- 95% status là ACTIVE, 5% INACTIVE.
"""

import random
from snowflake_id import snowflake

# Khoảng thời gian (phút) hợp lý theo từng loại nội dung
DURATION_RANGES = {
    "VIDEO": (8, 45),
    "QUIZ": (5, 15),
    "ASSIGNMENT": (15, 60),
    "PDF": (5, 20),
    "LIVE": (30, 90),
    "TEXT": (5, 15),
}

# Giới hạn thật của cột lesson.name (varchar(100)) — xem LessonEntity#name
LESSON_NAME_MAX_LENGTH = 100
# Rút gọn tên section trước khi nhét vào template, tránh câu quá dài
# vừa xấu văn phong vừa dễ đẩy lesson.name vượt 100 ký tự
SECTION_NAME_MAX_LENGTH_IN_TITLE = 50


def safe_truncate(text: str, max_length: int) -> str:
    """
    Cắt chuỗi an toàn nếu vượt quá giới hạn cột DB, thêm dấu '...' để biết đã bị cắt.
    Tránh lỗi 'Data too long for column' khi tên Section/Course quá dài
    bị nối vào template lesson name.
    """
    text = text.strip()
    if len(text) <= max_length:
        return text
    # Chừa 3 ký tự cho dấu '...'
    cutoff = max(max_length - 3, 0)
    return text[:cutoff].rstrip() + "..."


def generate_realistic_lessons(section_name: str, num_lessons: int):
    """
    Sinh danh sách bài học dựa vào TÊN SECTION thực tế.
    Bài đầu tiên luôn là bài giới thiệu (cố định), các bài còn lại
    được random hóa thứ tự chọn để tránh trùng lặp giữa các section
    cùng nhóm từ khóa.
    """
    s_name = section_name.strip()
    s_name_lower = s_name.lower()

    # Dùng bản rút gọn của tên section khi ghép vào tiêu đề bài học,
    # để câu văn không quá dài và không vượt giới hạn cột lesson.name (100 ký tự)
    s_name_short = safe_truncate(s_name, SECTION_NAME_MAX_LENGTH_IN_TITLE)

    # 1. Nhóm ngành Lập trình / IT
    if any(k in s_name_lower for k in ["python", "java", "lập trình", "web", "react", "node", "code", "c++", "it", "phần mềm", "backend", "frontend"]):
        pool = [
            f"Giới thiệu tổng quan về {s_name_short}",
            "Cài đặt môi trường và công cụ phát triển",
            f"Các khái niệm cốt lõi trong {s_name_short}",
            "Thực hành: Viết đoạn code đầu tiên",
            "Xử lý lỗi (Exception Handling) & Debugging",
            "Tối ưu hóa hiệu năng và Best Practices",
            f"Bài tập ứng dụng: Xây dựng mini-project với {s_name_short}",
            "Tài liệu tham khảo & Source Code đính kèm",
            "Kiểm tra kiến thức chương"
        ]
    # 2. Nhóm ngành Data / AI / Machine Learning
    elif any(k in s_name_lower for k in ["data", "ai", "machine learning", "dữ liệu", "sql", "phân tích", "big data"]):
        pool = [
            f"Tổng quan về {s_name_short}",
            "Phương pháp thu thập và tiền xử lý dữ liệu",
            "Trực quan hóa dữ liệu (Data Visualization)",
            f"Huấn luyện mô hình cơ bản với {s_name_short}",
            "Đánh giá hiệu suất (Evaluation Metrics)",
            f"Case Study: Ứng dụng {s_name_short} trong thực tế",
            "Thực hành: Phân tích dataset mẫu",
            "Quiz đánh giá năng lực phân tích"
        ]
    # 3. Nhóm ngành Kinh tế / Marketing / Quản trị
    elif any(k in s_name_lower for k in ["marketing", "seo", "kinh doanh", "sale", "quản trị", "kinh tế", "tài chính", "dự án"]):
        pool = [
            f"Nhập môn {s_name_short}",
            "Nghiên cứu thị trường và xác định Insight",
            "Lập kế hoạch chiến lược chi tiết",
            f"Các công cụ và framework hỗ trợ {s_name_short}",
            "Đo lường hiệu quả và chỉ số KPI/ROI",
            f"Phân tích Case Study thành công của {s_name_short}",
            "Bài tập: Xây dựng chiến dịch mẫu",
            "Tài liệu đọc thêm (PDF)"
        ]
    # 4. Nhóm Ngôn ngữ / Ngoại ngữ
    elif any(k in s_name_lower for k in ["tiếng anh", "ielts", "toeic", "giao tiếp", "ngôn ngữ", "ngữ pháp", "từ vựng"]):
        pool = [
            f"Từ vựng chuyên đề trọng tâm: {s_name_short}",
            f"Cấu trúc ngữ pháp cần nhớ trong {s_name_short}",
            "Luyện kỹ năng Nghe (Listening Practice)",
            "Luyện kỹ năng Đọc (Reading Practice)",
            "Thực hành Nói: Tips ghi điểm cao",
            "Hướng dẫn Viết: Cấu trúc ăn điểm",
            "Chữa đề thi mẫu chi tiết",
            "Mini-test kiểm tra đầu ra"
        ]
    # 5. Fallback - Dùng trực tiếp tên section vào tiêu đề chung
    else:
        pool = [
            f"Giới thiệu chung về {s_name_short}",
            f"Các nguyên lý cơ bản của {s_name_short}",
            f"Hướng dẫn chi tiết {s_name_short} từng bước",
            f"Thực hành ứng dụng {s_name_short}",
            "Các lỗi thường gặp và cách khắc phục",
            "Tài liệu học tập bổ sung (Slide)",
            f"Kiểm tra kiến thức phần {s_name_short}",
            "Tổng kết chương và Hỏi đáp (Q&A)"
        ]

    # Bài đầu tiên luôn cố định (giới thiệu), các bài còn lại random để tránh
    # trùng lặp 100% giữa nhiều section cùng nhóm từ khóa
    if num_lessons <= 1 or len(pool) <= 1:
        selected_titles = pool[:num_lessons]
    else:
        remaining_count = min(num_lessons - 1, len(pool) - 1)
        rest = random.sample(pool[1:], remaining_count)
        selected_titles = [pool[0]] + rest

    lessons = []
    for title in selected_titles:
        # Chốt chặn cuối cùng: dù template nào cũng không cho vượt quá
        # giới hạn cột lesson.name (100 ký tự) trước khi đưa vào DB
        safe_title = safe_truncate(title, LESSON_NAME_MAX_LENGTH)

        # Gán Content Type: kiểm tra từ khóa CỤ THỂ trước, từ khóa CHUNG sau
        # (tránh "Tài liệu... & Source Code" bị nhánh "tài liệu" nuốt mất trước khi tới "source code")
        t_lower = safe_title.lower()
        if "kiểm tra" in t_lower or "quiz" in t_lower or "test" in t_lower:
            l_type = "QUIZ"
        elif "hỏi đáp" in t_lower or "q&a" in t_lower:
            l_type = "LIVE"
        elif "source code" in t_lower:
            l_type = "TEXT"
        elif "thực hành" in t_lower or "bài tập" in t_lower or "project" in t_lower:
            l_type = "ASSIGNMENT"
        elif "tài liệu" in t_lower or "slide" in t_lower or "pdf" in t_lower:
            l_type = "PDF"
        else:
            l_type = "VIDEO"

        lessons.append({"name": safe_title, "type": l_type})

    return lessons


def get_sections_grouped_by_course(cursor):
    """
    Lấy thông tin section gồm: id, course_id, tên section để sinh dữ liệu sát thực tế.
    Sắp xếp theo order_index để đảm bảo section đầu tiên hiển thị đúng thứ tự
    thực tế (không dùng id, vì id chỉ phản ánh thứ tự TẠO, không phải thứ tự HIỂN THỊ).
    """
    try:
        cursor.execute("SELECT id, course_id, name FROM course_section ORDER BY course_id, order_index, id")
        rows = cursor.fetchall()
        courses = {}
        for row in rows:
            cid = row["course_id"]
            if cid not in courses:
                courses[cid] = []
            courses[cid].append({
                "id": row["id"],
                "name": row["name"]
            })
        return courses
    except Exception as e:
        print(f"   [Lỗi] Lỗi khi query course_section: {e}. Vui lòng check lại tên cột (name/title, order_index) và khóa ngoại course_id.")
        return {}


def check_section_has_lessons(cursor, section_id: int):
    """Kiểm tra Idempotent."""
    cursor.execute("SELECT id FROM lesson WHERE section_id = %s LIMIT 1", (section_id,))
    return cursor.fetchone() is not None


def seed(cursor):
    """Tiến hành insert dữ liệu."""
    print("→ Seeding lessons (Contextual real data)...")

    courses = get_sections_grouped_by_course(cursor)
    if not courses:
        return

    total_inserted = 0

    for course_id, sections in courses.items():
        lesson_count_in_course = 0
        free_limit = random.randint(1, 2)

        for sec in sections:
            section_id = sec["id"]
            section_name = sec["name"]

            if check_section_has_lessons(cursor, section_id):
                # Vẫn đếm số lesson cũ để tính logic FREE/LOCKED cho đúng
                cursor.execute("SELECT COUNT(id) AS cnt FROM lesson WHERE section_id = %s", (section_id,))
                lesson_count_in_course += cursor.fetchone()["cnt"]
                continue

            num_lessons = random.randint(3, 5)
            generated_lessons = generate_realistic_lessons(section_name, num_lessons)

            for i, lesson_data in enumerate(generated_lessons):
                lesson_count_in_course += 1

                preview_type = "FREE" if lesson_count_in_course <= free_limit else "LOCKED"
                status = random.choices(["ACTIVE", "INACTIVE"], weights=[95, 5], k=1)[0]

                # Tên đã được safe_truncate ở generate_realistic_lessons, nhưng vẫn
                # truncate lại 1 lần nữa ở đây như lớp phòng vệ cuối cùng trước insert,
                # phòng trường hợp lesson_data["name"] bị chỉnh sửa/nối thêm ở chỗ khác sau này
                name = safe_truncate(lesson_data["name"], LESSON_NAME_MAX_LENGTH)
                content_type = lesson_data["type"]

                # Duration hợp lý theo từng loại nội dung, thay vì random đồng nhất 5-45 cho mọi loại
                dur_min, dur_max = DURATION_RANGES.get(content_type, (5, 45))
                duration = random.randint(dur_min, dur_max)

                ext = ".mp4" if content_type == "VIDEO" else ".pdf" if content_type == "PDF" else ""
                content_url = f"https://s3.lms.com/lessons/{content_type.lower()}_{snowflake.next_id()}{ext}" if ext else ""

                new_id = snowflake.next_id()
                order_index = i + 1

                cursor.execute(
                    """
                    INSERT INTO lesson (
                        id, section_id, name, content_type, content_url, description,
                        duration_min, preview_type, order_index, status, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """,
                    (
                        new_id,
                        section_id,
                        name,
                        content_type,
                        content_url,
                        f"Nội dung chi tiết cho bài học: {name}",
                        duration,
                        preview_type,
                        order_index,
                        status
                    ),
                )
                total_inserted += 1

    print(f"   Đã thêm mới {total_inserted} bài học bám sát nội dung Section.")