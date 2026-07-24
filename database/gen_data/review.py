"""
seed_reviews.py
----------------
Seed dữ liệu cho bảng `review` (Đánh giá khóa học).
- Có CHỐT CHẶN TỔNG: Khóa học đã có đánh giá -> Skip để chống lặp dữ liệu.
- Mỗi khóa học có từ 10 - 15 đánh giá từ các user ngẫu nhiên.
- Tỉ lệ sao: 60% 5 sao, 25% 4 sao, 12% 3 sao, 3% 1-2 sao (Poor).
- Nhận xét (comment) được sinh tự nhiên, bằng tiếng Việt, logic với số sao.
- status: 95% ACTIVE, 3% PENDING, 2% REJECTED (kèm lý do).
- Tối ưu Batch Insert (2000 records/lần).
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime, timedelta
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

# Tỉ lệ sao (100 phần tử)
RATING_POOL = (
    [5] * 60 + 
    [4] * 25 + 
    [3] * 12 + 
    [2] * 2 + 
    [1] * 1
)

# Tỉ lệ trạng thái: 95% ACTIVE, 2% REJECTED
STATUS_POOL = ["ACTIVE"] * 98 + ["REJECTED"] * 2
COMMENTS_5_STAR = [
    "Mình thực sự rất hài lòng với khóa học này. Nội dung được xây dựng theo lộ trình rất rõ ràng, từ những kiến thức cơ bản đến các chủ đề nâng cao. Giảng viên giải thích dễ hiểu, ví dụ minh họa sát với thực tế nên mình có thể áp dụng ngay vào dự án cá nhân. Sau khi hoàn thành khóa học, mình cảm thấy tự tin hơn rất nhiều và chắc chắn sẽ tiếp tục học thêm các khóa khác.",

    "Đây là một trong những khóa học chất lượng nhất mà mình từng tham gia. Video rõ nét, âm thanh tốt, tài liệu đầy đủ và đặc biệt là phần bài tập thực hành rất hữu ích. Mình đánh giá cao cách giảng viên chia sẻ kinh nghiệm thực tế thay vì chỉ dạy lý thuyết. Khóa học hoàn toàn xứng đáng với số tiền mình đã bỏ ra.",

    "Ban đầu mình chỉ mong có thêm kiến thức để phục vụ công việc, nhưng sau khi học xong mình còn học được rất nhiều kinh nghiệm thực tế từ giảng viên. Cách truyền đạt rất cuốn hút, không hề gây nhàm chán. Mình đã áp dụng được nhiều kiến thức vào công việc hằng ngày và nhận được phản hồi tích cực từ đồng nghiệp.",

    "Lộ trình học được thiết kế rất hợp lý, từng chương đều liên kết chặt chẽ với nhau nên việc tiếp thu khá dễ dàng. Những bài tập cuối mỗi chương giúp mình ôn lại kiến thức rất hiệu quả. Mình đặc biệt thích phần dự án cuối khóa vì có thể tổng hợp toàn bộ kiến thức đã học để xây dựng một sản phẩm hoàn chỉnh.",

    "Mình gần như không có nền tảng trước khi bắt đầu khóa học nhưng vẫn có thể theo kịp nhờ cách giảng rất chi tiết của giảng viên. Những phần khó đều được giải thích nhiều lần bằng các ví dụ khác nhau. Sau khi hoàn thành khóa học mình cảm thấy đã có nền tảng khá vững để tiếp tục học các kiến thức nâng cao hơn.",

    "Điều mình thích nhất ở khóa học là không chỉ dạy cách làm mà còn giải thích vì sao phải làm như vậy. Điều này giúp mình hiểu bản chất của vấn đề thay vì chỉ làm theo hướng dẫn. Đây là khóa học mình sẽ sẵn sàng giới thiệu cho bạn bè hoặc đồng nghiệp nếu họ muốn bắt đầu học lĩnh vực này."
]

COMMENTS_4_STAR = [
    "Nhìn chung mình khá hài lòng với khóa học. Nội dung được trình bày khoa học, dễ theo dõi và có nhiều ví dụ thực tế. Tuy nhiên vẫn còn một vài bài giảng có tốc độ hơi nhanh, mình phải xem lại nhiều lần mới theo kịp. Nếu cập nhật thêm bài tập thực hành thì khóa học sẽ hoàn thiện hơn.",

    "Khóa học cung cấp khá đầy đủ những kiến thức cần thiết cho người mới bắt đầu. Giảng viên có chuyên môn tốt và truyền đạt dễ hiểu. Chỉ có một số video âm lượng hơi nhỏ và chất lượng hình ảnh chưa thực sự đồng đều, nhưng nhìn chung không ảnh hưởng quá nhiều đến trải nghiệm học tập.",

    "Mình đánh giá đây là một khóa học đáng học trong tầm giá. Phần lý thuyết khá chi tiết và có nhiều ví dụ minh họa. Tuy nhiên mình mong sẽ có thêm nhiều bài tập thực tế hoặc mini project để người học có cơ hội luyện tập nhiều hơn sau mỗi chương.",

    "Khóa học khá tốt và đáp ứng được kỳ vọng của mình. Nội dung tương đối đầy đủ, cách trình bày logic và dễ hiểu. Chỉ tiếc là một số kiến thức đã có phiên bản mới nhưng chưa được cập nhật, hy vọng đội ngũ sẽ bổ sung trong thời gian tới.",

    "Sau khi hoàn thành khóa học mình đã nắm được khá nhiều kiến thức hữu ích. Giảng viên hướng dẫn rất nhiệt tình và giải đáp rõ ràng. Nếu phần cuối khóa có thêm một dự án lớn để tổng hợp toàn bộ kiến thức thì mình nghĩ trải nghiệm sẽ còn tốt hơn nữa."
]

COMMENTS_3_STAR = [
    "Khóa học ở mức chấp nhận được và phù hợp với người mới bắt đầu. Nội dung chủ yếu tập trung vào những kiến thức cơ bản nên mình học khá dễ. Tuy nhiên nếu đã có nền tảng trước đó thì sẽ cảm thấy chưa đủ chiều sâu và cần tìm thêm tài liệu để học nâng cao.",

    "Mình hoàn thành toàn bộ khóa học nhưng cảm thấy nội dung chưa thực sự nổi bật. Một số kiến thức vẫn hữu ích, tuy nhiên có vài phần đã hơi cũ và chưa cập nhật theo xu hướng hiện tại. Hy vọng giảng viên sẽ sớm bổ sung những nội dung mới hơn.",

    "Giảng viên có kiến thức chuyên môn tốt nhưng cách trình bày hơi đều nên đôi lúc mình cảm thấy thiếu điểm nhấn. Các ví dụ minh họa chưa nhiều và phần thực hành còn khá ít. Khóa học vẫn phù hợp để tham khảo nhưng chưa tạo được nhiều ấn tượng với mình.",

    "Mình kỳ vọng khóa học sẽ có nhiều tình huống thực tế hơn. Nội dung cơ bản tương đối đầy đủ nhưng phần bài tập chưa đủ để mình luyện tập thường xuyên. Sau khi học xong mình vẫn phải tìm thêm tài liệu và dự án bên ngoài để củng cố kiến thức.",

    "Khóa học không tệ nhưng cũng chưa thật sự xuất sắc. Video và tài liệu ở mức ổn, giao diện học tập dễ sử dụng. Tuy nhiên cách sắp xếp một số chương chưa hợp lý và có vài nội dung bị lặp lại khiến thời lượng học dài hơn cần thiết."
]

COMMENTS_POOR = [ # 1 - 2 sao
    "Chất lượng video quá tệ, mờ và giật lác liên tục.",
    "Nội dung lan man, không đúng như những gì quảng cáo.",
    "Tiếc tiền quá, học xong không đọng lại được gì.",
    "Support rất chậm, hỏi giảng viên cả tuần không thấy trả lời.",
    "Đề nghị cập nhật lại nội dung, dùng công nghệ lỗi thời hết rồi."
]

REJECTION_REASONS = [
    "Sử dụng ngôn từ thô tục, vi phạm tiêu chuẩn cộng đồng.",
    "Bình luận chứa link spam, quảng cáo khóa học khác.",
    "Đánh giá không liên quan đến nội dung chuyên môn của khóa học."
]


def get_all_courses(cursor):
    """Lấy danh sách id và created_at từ khóa học. BẮT BUỘC ORDER BY."""
    try:
        cursor.execute("SELECT id, created_at FROM course ORDER BY id")
    except Exception:
        cursor.execute("SELECT id, created_at FROM courses ORDER BY id")
    return cursor.fetchall()


def get_all_students(cursor):
    """Lấy danh sách user_id của học viên. BẮT BUỘC ORDER BY."""
    try:
        cursor.execute("SELECT user_id FROM student_profile ORDER BY user_id")
    except Exception:
        cursor.execute("SELECT user_id FROM student_profiles ORDER BY user_id")
    return [row["user_id"] for row in cursor.fetchall()]


def check_course_has_reviews(cursor, course_id: int):
    """
    ---> CHỐT CHẶN TỔNG <---
    Khóa học đã có đánh giá chưa? Có rồi thì skip ngay!
    """
    query = "SELECT 1 FROM review WHERE course_id = %s LIMIT 1"
    try:
        cursor.execute(query, (course_id,))
    except Exception:
        cursor.execute("SELECT 1 FROM reviews WHERE course_id = %s LIMIT 1", (course_id,))
    return cursor.fetchone() is not None


def seed(cursor):
    print("→ Seeding reviews (Đánh giá khóa học)...")

    courses = get_all_courses(cursor)
    if not courses:
        print("   [warning] Bảng `course` đang trống!")
        return

    students = get_all_students(cursor)
    if not students:
        print("   [warning] Bảng `student_profile` đang trống!")
        return

    total_courses = len(courses)
    total_students = len(students)
    print(f"   [info] Tìm thấy {total_courses} khóa học và {total_students} học viên.")

    batch_data = []
    total_inserted = 0
    total_skipped = 0
    now = datetime.now()

    for idx, course in enumerate(courses):
        course_id = course["id"]
        course_created_at = course["created_at"] if course["created_at"] else now - timedelta(days=365)

        # ---> KIỂM TRA CHỐT CHẶN <---
        if check_course_has_reviews(cursor, course_id):
            total_skipped += 1
            continue

        # Mỗi khóa học có ít nhất 10 đánh giá, tối đa 15 (hoặc bằng tổng học viên nếu hệ thống quá ít học viên)
        num_reviews = random.randint(10, 15)
        num_reviews = min(num_reviews, total_students)

        # Chọn ngẫu nhiên num_reviews học viên KHÔNG TRÙNG LẶP cho khóa học này
        reviewer_ids = random.sample(students, num_reviews)

        for user_id in reviewer_ids:
            rating = random.choice(RATING_POOL)
            
            # Chọn comment dựa trên số sao
            if rating == 5:
                comment = random.choice(COMMENTS_5_STAR)
            elif rating == 4:
                comment = random.choice(COMMENTS_4_STAR)
            elif rating == 3:
                comment = random.choice(COMMENTS_3_STAR)
            else:
                comment = random.choice(COMMENTS_POOR)
            
            # Đôi khi user lười không thèm ghi comment
            if random.random() < 0.15:
                comment = None

            status = random.choice(STATUS_POOL)
            
            rejection_reason = None
            if status == "REJECTED":
                rejection_reason = random.choice(REJECTION_REASONS)
                # Đánh giá bị reject thường có comment thô tục/spam
                comment = "Đánh giá này đã bị ẩn vì vi phạm tiêu chuẩn cộng đồng."

            # Ngày đánh giá phải sau ngày tạo khóa học
            days_since_creation = (now - course_created_at).days
            days_ago = random.randint(0, max(1, days_since_creation))
            created_at = now - timedelta(days=days_ago, hours=random.randint(1, 23))

            new_id = snowflake.next_id()

            batch_data.append((
                new_id,
                course_id,
                user_id,
                rating,
                comment,
                status,
                rejection_reason,
                user_id,         # created_by = Học viên viết đánh giá
                None,            # updated_by
                created_at,
                created_at
            ))

            # Insert Batch mỗi 2000 dòng
            if len(batch_data) >= 2000:
                try:
                    cursor.executemany(
                        """
                        INSERT INTO review (
                            id, course_id, user_id, rating, comment, status, rejection_reason, 
                            created_by, updated_by, created_at, updated_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        batch_data
                    )
                except Exception:
                    cursor.executemany(
                        """
                        INSERT INTO reviews (
                            id, course_id, user_id, rating, comment, status, rejection_reason, 
                            created_by, updated_by, created_at, updated_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        batch_data
                    )
                total_inserted += len(batch_data)
                batch_data.clear()

        # Print tiến độ mỗi 500 khóa học
        if (idx + 1) % 500 == 0 or (idx + 1) == total_courses:
            print(f"   [progress] Đã xử lý {idx + 1}/{total_courses} khóa học (Total reviews: {total_inserted + len(batch_data)})...")

    # Insert batch cuối cùng
    if batch_data:
        try:
            cursor.executemany(
                """
                INSERT INTO review (
                    id, course_id, user_id, rating, comment, status, rejection_reason, 
                    created_by, updated_by, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                batch_data
            )
        except Exception:
            cursor.executemany(
                """
                INSERT INTO reviews (
                    id, course_id, user_id, rating, comment, status, rejection_reason, 
                    created_by, updated_by, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                batch_data
            )
        total_inserted += len(batch_data)
        batch_data.clear()

    print(f"   [completed] Hoàn tất seed review! Inserted: {total_inserted} | Skipped: {total_skipped} khóa học.")