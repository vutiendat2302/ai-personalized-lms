"""
review_api.py
Sinh đánh giá khóa học và giáo viên sau khi enrollment đạt 100% completion.
Idempotent: bỏ qua nếu đã có review cùng student/course.
"""

from __future__ import annotations

import os
import random
import time
from typing import Any

from course_content_api import AilmsApi

# Pool comment theo rating (5 → 1 sao)
COMMENTS: dict[int, list[str]] = {
    5: [
        "Khóa học xuất sắc! Nội dung rõ ràng, thực hành phong phú và giáo viên nhiệt tình hướng dẫn. Tôi đã áp dụng được ngay vào công việc.",
        "Một trong những khóa học tốt nhất tôi từng tham gia. Bài giảng logic, ví dụ thực tế và hỗ trợ kịp thời. Rất đáng đầu tư thời gian và tiền bạc.",
        "Nội dung chất lượng cao, cập nhật xu hướng mới nhất. Giáo viên giải thích dễ hiểu, bài tập thực hành vừa sức giúp củng cố kiến thức hiệu quả.",
        "Khóa học thay đổi cách tôi tiếp cận công việc hoàn toàn. Từ lý thuyết đến thực hành đều được bao quát kỹ lưỡng. Rất khuyến khích!",
        "Tuyệt vời! Tiến độ học tập hợp lý, tài liệu tham khảo phong phú. Tôi cảm thấy tự tin hơn nhiều sau khi hoàn thành khóa học này.",
    ],
    4: [
        "Khóa học tốt, nội dung đầy đủ và thực tiễn. Chỉ cần bổ sung thêm một số ví dụ phức tạp hơn sẽ hoàn hảo. Vẫn rất xứng đáng 4 sao.",
        "Nội dung hay và có chiều sâu. Giáo viên giải thích rõ ràng, mặc dù tốc độ đôi khi hơi nhanh với người mới bắt đầu.",
        "Khóa học chất lượng với nhiều bài thực hành giá trị. Phần cuối cần chi tiết hơn nhưng nhìn chung rất hài lòng với những gì học được.",
        "Tốt hơn mong đợi! Cấu trúc khóa học hợp lý, tài liệu tham khảo phong phú. Cần thêm thời gian Q&A với giáo viên sẽ hoàn hảo hơn.",
    ],
    3: [
        "Nội dung ở mức khá, phù hợp cho người muốn có cái nhìn tổng quan. Tuy nhiên cần thêm bài thực hành và ví dụ thực tế hơn.",
        "Kiến thức cơ bản được trình bày ổn. Phần nâng cao còn khá sơ lược, mong rằng giáo viên cập nhật thêm nội dung trong thời gian tới.",
        "Khóa học đáp ứng được kỳ vọng ban đầu. Phần Q&A có thể được cải thiện để hỗ trợ học viên tốt hơn trong quá trình thực hành.",
    ],
    2: [
        "Nội dung cơ bản nhưng chưa đi sâu vào thực hành. Cần cập nhật lại để phù hợp với nhu cầu hiện tại của thị trường.",
        "Mong đợi nhiều hơn nhưng nội dung còn khá lý thuyết. Sẽ tốt hơn nếu có nhiều project thực tế hơn.",
    ],
    1: [
        "Nội dung chưa cập nhật và thiếu bài thực hành. Cần cải thiện đáng kể để đáp ứng kỳ vọng của học viên.",
    ],
}

TEACHER_COMMENTS = [
    "Giáo viên nhiệt tình, giải thích rõ ràng và luôn sẵn sàng hỗ trợ học viên kịp thời.",
    "Thầy/Cô có kinh nghiệm thực tế phong phú, chia sẻ nhiều kiến thức thực tiễn hữu ích.",
    "Phong cách dạy học gần gũi, dễ tiếp thu. Giáo viên luôn khuyến khích học viên đặt câu hỏi.",
    "Kiến thức chuyên sâu, ví dụ minh họa thực tế và rất tận tâm trong việc hướng dẫn.",
    "Giáo viên chuyên nghiệp, bài giảng có cấu trúc tốt và tốc độ phù hợp với nhiều trình độ.",
    "Thầy/Cô trả lời câu hỏi nhanh chóng và chính xác, hỗ trợ học viên rất tốt.",
    "Phương pháp giảng dạy hiệu quả, kết hợp lý thuyết và thực hành hài hòa.",
]

# Phân phối rating: 60% 5 sao, 25% 4 sao, 12% 3 sao, 2% 2 sao, 1% 1 sao
RATING_POOL = [5] * 60 + [4] * 25 + [3] * 12 + [2] * 2 + [1] * 1


def get_students(admin_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách student ACTIVE từ backend."""
    res = admin_api.request("GET", "/v1/users/page", params={"roleType": "STUDENT", "page": 0, "size": 100})
    return res.get("content", [])


def get_completed_enrollments(admin_api: AilmsApi, user_id: str) -> list[dict[str, Any]]:
    """Lấy các enrollment đã hoàn thành 100% của student."""
    try:
        enrollments = admin_api.request("GET", f"/v1/enrollments/user/{user_id}")
        items = enrollments if isinstance(enrollments, list) else enrollments.get("content", [])
        return [e for e in items if e.get("status") == 1 or e.get("completedAt")]
    except Exception:
        return []


def already_reviewed(student_api: AilmsApi, course_id: str, user_id: str) -> bool:
    """Kiểm tra student này đã review khóa này chưa — query theo userId để tránh false-positive."""
    try:
        reviews = student_api.request(
            "GET", f"/v1/reviews/courses/{course_id}/reviews",
            params={"userId": user_id},
        )
        items = reviews if isinstance(reviews, list) else reviews.get("content", [])
        return any(str(r.get("userId") or r.get("studentId", "")) == str(user_id) for r in items)
    except Exception:
        return False


def create_review(
    student_api: AilmsApi,
    course_id: str,
    user_id: str,
    rng: random.Random,
) -> bool:
    """Tạo review khóa học và giáo viên với nội dung ngẫu nhiên theo seed."""
    rating = rng.choice(RATING_POOL)
    comment = rng.choice(COMMENTS.get(rating, COMMENTS[3]))
    teacher_rating = max(1, min(5, rating + rng.randint(-1, 1)))
    teacher_comment = rng.choice(TEACHER_COMMENTS)

    try:
        student_api.request(
            "POST", f"/v1/reviews/courses/{course_id}/reviews",
            params={"userId": user_id},
            json={
                "rating": rating,
                "comment": comment,
                "teacherRating": teacher_rating,
                "teacherComment": teacher_comment,
            },
        )
        return True
    except RuntimeError as ex:
        err = str(ex).lower()
        if any(k in err for k in ["already", "duplicate", "reviewed", "đã", "tồn tại"]):
            return False  # Đã review rồi, skip
        raise


def get_all_enrollments(admin_api: AilmsApi, user_id: str) -> list[dict[str, Any]]:
    """Lấy tất cả enrollment của student (cả completed và in-progress) để sinh review đa dạng."""
    try:
        res = admin_api.request("GET", f"/v1/enrollments/user/{user_id}")
        items = res if isinstance(res, list) else res.get("content", [])
        return items
    except Exception:
        return []


def seed_reviews() -> None:
    """Sinh đánh giá cho enrollment đã hoàn thành 100%; fallback sang tất cả enrollment nếu không có."""
    base_url = os.getenv("AILMS_API_BASE_URL", "http://localhost:8080/api")
    password = os.getenv("AILMS_SEED_PASSWORD", "Password@123")
    admin_username = os.getenv("AILMS_SEED_ADMIN_USERNAME", "admin.report")
    admin_password = os.getenv("AILMS_SEED_ADMIN_PASSWORD", password)

    admin = AilmsApi(base_url)
    admin.login(admin_username, admin_password)

    students = get_students(admin)
    if not students:
        print("   [warn] Không có student. Bỏ qua review.")
        return

    total_created = total_skip = 0

    for idx, student in enumerate(students):
        username = student.get("username") or student.get("email", "?")
        user_id = str(student["id"])

        student_api = AilmsApi(base_url)
        try:
            student_api.login(username, password)
        except RuntimeError as ex:
            print(f"   [err] login {username}: {ex}")
            continue

        # Ưu tiên enrollment completed; nếu không có thì dùng tất cả enrollment
        enrollments = get_completed_enrollments(admin, user_id)
        if not enrollments:
            enrollments = get_all_enrollments(admin, user_id)
        if not enrollments:
            continue

        print(f"   → [{idx+1}/{len(students)}] {username}: {len(enrollments)} enrollment để review")

        for enr in enrollments:
            course_id = str(enr.get("courseId") or "")
            if not course_id:
                continue

            # Kiểm tra per-student đã review chưa
            if already_reviewed(student_api, course_id, user_id):
                total_skip += 1
                continue

            # Seed cố định per (student, course)
            review_rng = random.Random(int(user_id) * 31337 + int(course_id))
            try:
                created = create_review(student_api, course_id, user_id, review_rng)
                if created:
                    total_created += 1
                else:
                    total_skip += 1
                time.sleep(0.2)
            except RuntimeError as ex:
                print(f"      [err] review course={course_id}: {ex}")
                time.sleep(0.3)

    print(f"   [review] {total_created} review mới, {total_skip} đã có")
