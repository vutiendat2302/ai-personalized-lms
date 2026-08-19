"""
learning_progress_api.py
Hoàn thành 100% các bài học trong enrollment của mỗi student qua Backend API.
Xử lý VIDEO (watchPercent=100), TEXT/PDF (markCompleted), QUIZ (attempt+submit), ASSIGNMENT (submit+grade).
Idempotent: bỏ qua lesson đã completed.
"""

from __future__ import annotations

import os
import time
from typing import Any

from course_content_api import AilmsApi

# Thời lượng fallback (giây) khi lesson không có durationSec
VIDEO_DURATION_FALLBACK = {"mau1.mp4": 185, "mau2.mp4": 240, "mau3.mp4": 310, "default": 200}

# Câu trả lời mẫu cho bài tập tự luận
ASSIGNMENT_ANSWER_TEMPLATE = (
    "Qua quá trình học tập, tôi đã nắm vững các kiến thức và kỹ năng cốt lõi của khóa học. "
    "Tôi đã thực hành áp dụng vào dự án thực tế và nhận thấy sự cải thiện rõ rệt trong tư duy lập trình. "
    "Bài học quan trọng nhất là việc hiểu sâu nguyên lý thay vì chỉ copy code, "
    "và luôn chú trọng đến chất lượng, khả năng bảo trì của sản phẩm. "
    "Tôi cam kết tiếp tục áp dụng kiến thức này vào công việc hàng ngày."
)


def get_all_students(admin_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách student ACTIVE từ backend."""
    res = admin_api.request("GET", "/v1/users/page", params={"roleType": "STUDENT", "page": 0, "size": 100})
    return res.get("content", [])


def get_all_teachers(admin_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách teacher để dùng chấm điểm bài tập."""
    res = admin_api.request("GET", "/v1/users/page", params={"roleType": "TEACHER", "page": 0, "size": 20})
    return res.get("content", [])


def get_enrollment_courses(admin_api: AilmsApi, user_id: str) -> list[dict[str, Any]]:
    """Lấy danh sách enrollment của student từ API backend."""
    try:
        res = admin_api.request("GET", f"/v1/enrollments/user/{user_id}")
        return res if isinstance(res, list) else res.get("content", [])
    except Exception:
        return []


def get_course_curriculum(student_api: AilmsApi, course_id: str) -> dict[str, Any]:
    """Lấy curriculum khóa học kèm enrollmentId và tiến độ từng lesson."""
    return student_api.request("GET", f"/v1/learning/courses/{course_id}")


def complete_video_lesson(student_api: AilmsApi, lesson: dict, enrollment_id: str, user_id: str) -> None:
    """Báo cáo tiến độ 100% cho bài video để backend đánh dấu completed."""
    duration = lesson.get("durationSec") or VIDEO_DURATION_FALLBACK.get(
        (lesson.get("contentUrl") or "").split("/")[-1],
        VIDEO_DURATION_FALLBACK["default"],
    )
    student_api.request(
        "PUT", f"/v1/learning/lessons/{lesson['id']}/progress",
        params={"enrollmentId": enrollment_id},
        json={"watchPercent": 100, "lastPositionSec": duration, "timeSpentSec": duration, "markCompleted": True},
    )


def complete_text_pdf_lesson(student_api: AilmsApi, lesson: dict, enrollment_id: str, user_id: str) -> None:
    """Đánh dấu hoàn thành bài text/PDF bằng endpoint complete."""
    student_api.request(
        "POST", f"/v1/learning/lessons/{lesson['id']}/complete",
        params={"enrollmentId": enrollment_id},
    )


def complete_quiz_lesson(student_api: AilmsApi, lesson: dict, enrollment_id: str, user_id: str) -> None:
    """Tạo attempt, submit với đáp án đúng và đánh dấu hoàn thành bài quiz."""
    quiz = lesson.get("linkedQuiz")
    if quiz:
        quiz_id = str(quiz["id"])
        try:
            attempt_id = student_api.request("POST", f"/v1/assessments/quizzes/{quiz_id}/attempts", params={"userId": user_id})
            if attempt_id:
                answers = []
                for q in quiz.get("questions") or []:
                    correct_option = next((o for o in (q.get("options") or []) if o.get("isCorrect")), None)
                    if correct_option:
                        answers.append({"questionId": q["id"], "selectedOptionId": correct_option["id"]})
                    elif q.get("options"):
                        answers.append({"questionId": q["id"], "selectedOptionId": q["options"][0]["id"]})

                student_api.request(
                    "POST", f"/v1/assessments/quiz-attempts/{attempt_id}/submit",
                    json={"answers": answers},
                )
        except Exception:
            pass

    # Đánh dấu hoàn thành bài học trên enrollment
    student_api.request(
        "POST", f"/v1/learning/lessons/{lesson['id']}/complete",
        params={"enrollmentId": enrollment_id},
    )


def complete_assignment_lesson(
    student_api: AilmsApi,
    lesson: dict,
    enrollment_id: str,
    user_id: str,
    teacher_id: str,
    teacher_api: AilmsApi,
) -> None:
    """Submit bài tập, chấm điểm qua teacher API và đánh dấu hoàn thành bài học."""
    assignment = lesson.get("linkedAssignment")
    if assignment:
        assignment_id = str(assignment["id"])
        try:
            submission_id = student_api.request(
                "POST", f"/v1/assessments/assignments/{assignment_id}/submissions",
                params={"userId": user_id},
                json={"contentText": ASSIGNMENT_ANSWER_TEMPLATE, "fileUrl": None},
            )
            if submission_id:
                teacher_api.request(
                    "POST", f"/v1/assessments/submissions/{submission_id}/grade",
                    params={"teacherUserId": teacher_id},
                    json={"score": 95, "feedback": "Bài làm đạt yêu cầu, trình bày rõ ràng và có chiều sâu.", "returnForResubmission": False},
                )
        except Exception:
            pass

    # Đánh dấu hoàn thành bài học trên enrollment
    student_api.request(
        "POST", f"/v1/learning/lessons/{lesson['id']}/complete",
        params={"enrollmentId": enrollment_id},
    )


def is_lesson_completed(lesson: dict) -> bool:
    """Kiểm tra lesson đã có progress completed để bỏ qua (idempotent)."""
    progress = lesson.get("myProgress") or {}
    return bool(progress.get("status") == 1 or progress.get("completed") or progress.get("completedAt"))


def complete_enrollment(
    student_api: AilmsApi,
    course_id: str,
    enrollment_id: str,
    user_id: str,
    teacher_id: str,
    teacher_api: AilmsApi,
) -> int:
    """
    Hoàn thành tất cả lesson trong một enrollment.
    Trả số lesson đã complete thành công.
    """
    curriculum = get_course_curriculum(student_api, course_id)
    sections = curriculum.get("sections") or []
    lessons_done = 0

    for section in sections:
        for lesson in section.get("lessons") or []:
            if is_lesson_completed(lesson):
                continue
            content_type = lesson.get("contentType", "")
            lesson_id = lesson.get("id")
            if not lesson_id:
                continue
            try:
                if content_type == "VIDEO":
                    complete_video_lesson(student_api, lesson, enrollment_id, user_id)
                elif content_type in {"TEXT", "PDF"}:
                    complete_text_pdf_lesson(student_api, lesson, enrollment_id, user_id)
                elif content_type == "QUIZ":
                    complete_quiz_lesson(student_api, lesson, enrollment_id, user_id)
                elif content_type == "ASSIGNMENT":
                    complete_assignment_lesson(student_api, lesson, enrollment_id, user_id, teacher_id, teacher_api)
                else:
                    # Loại khác: thử markCompleted generic
                    try:
                        student_api.request("POST", f"/v1/learning/lessons/{lesson_id}/complete",
                                            params={"enrollmentId": enrollment_id})
                    except Exception:
                        pass
                lessons_done += 1
                time.sleep(0.15)
            except RuntimeError as ex:
                err = str(ex).lower()
                if "already" in err or "completed" in err or "đã" in err:
                    lessons_done += 1
                else:
                    print(f"            [warn] lesson {lesson_id} ({content_type}): {ex}")

    return lessons_done


def seed_learning_progress() -> None:
    """Điều phối hoàn thành 100% curriculum cho tất cả enrollment của mọi student."""
    base_url = os.getenv("AILMS_API_BASE_URL", "http://localhost:8080/api")
    password = os.getenv("AILMS_SEED_PASSWORD", "Password@123")
    admin_username = os.getenv("AILMS_SEED_ADMIN_USERNAME", "admin.report")
    admin_password = os.getenv("AILMS_SEED_ADMIN_PASSWORD", password)

    admin = AilmsApi(base_url)
    admin.login(admin_username, admin_password)

    students = get_all_students(admin)
    teachers = get_all_teachers(admin)
    if not students:
        print("   [warn] Không có student. Bỏ qua learning progress.")
        return
    if not teachers:
        print("   [warn] Không có teacher để chấm bài.")
        return

    # Chuẩn bị teacher API
    default_teacher = teachers[0]
    teacher_api = AilmsApi(base_url)
    try:
        teacher_api.login(default_teacher.get("username") or default_teacher.get("email"), password)
        teacher_id = str(default_teacher["id"])
    except RuntimeError as ex:
        print(f"   [err] Login teacher thất bại: {ex}")
        return

    total_lessons = total_enrollments = 0

    for idx, student in enumerate(students):
        username = student.get("username") or student.get("email", "?")
        user_id = str(student["id"])

        student_api = AilmsApi(base_url)
        try:
            student_api.login(username, password)
        except RuntimeError as ex:
            print(f"   [err] login {username}: {ex}")
            continue

        # Lấy các enrollment của student từ API backend
        enrollments = get_enrollment_courses(admin, user_id)
        if not enrollments:
            continue

        print(f"   → [{idx+1}/{len(students)}] {username}: {len(enrollments)} enrollment")

        for enr in enrollments:
            course_id = str(enr.get("courseId") or "")
            enrollment_id = str(enr.get("id") or "")
            if not course_id or not enrollment_id:
                continue
            try:
                done = complete_enrollment(student_api, course_id, enrollment_id, user_id, teacher_id, teacher_api)
                total_lessons += done
                total_enrollments += 1
                time.sleep(0.2)
            except RuntimeError as ex:
                print(f"      [err] enrollment course={course_id}: {ex}")

    print(f"   [learning] {total_enrollments} enrollment, {total_lessons} lesson completed")
