"""
class_lifecycle_api.py
Sinh dữ liệu lớp học nhóm (GROUP_CLASS) và quy trình 1-1 (ONE_ON_ONE) qua Backend API.
Luồng GROUP_CLASS: tạo lớp → gán teacher → cập nhật lịch → tạo buổi học.
Luồng ONE_ON_ONE: HR notify → Teacher accept → HR mark-contacted (tạo trial) → Teacher review → Student accept.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta
from typing import Any

from course_content_api import AilmsApi


def get_all_teachers(admin_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách teacher ACTIVE từ backend."""
    res = admin_api.request("GET", "/v1/users/page", params={
        "roleType": "TEACHER", "page": 0, "size": 50,
    })
    return res.get("content", [])


def get_active_courses_with_category(admin_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy khóa học ACTIVE kèm categoryId để tạo lớp."""
    courses = admin_api.request("GET", "/v1/courses")
    return [c for c in (courses or []) if c.get("status") == "ACTIVE"]


def get_group_packages(admin_api: AilmsApi, course_id: str) -> list[dict[str, Any]]:
    """Lấy các gói GROUP_CLASS ACTIVE của một khóa học."""
    try:
        pkgs = admin_api.request("GET", f"/v1/course-packages/course/{course_id}")
        return [p for p in (pkgs or []) if p.get("deliveryMode") == "GROUP_CLASS" and p.get("status") == "ACTIVE"]
    except Exception:
        return []


def find_existing_group_class(admin_api: AilmsApi, course_id: str) -> dict[str, Any] | None:
    """Kiểm tra lớp GROUP_CLASS đã tồn tại cho course để chống tạo trùng."""
    try:
        classes = admin_api.request("GET", f"/v1/classes/course/{course_id}")
        return next((c for c in (classes or []) if c.get("packageType") == "GROUP_CLASS"), None)
    except Exception:
        return None


def next_weekday(weekday: int) -> datetime:
    """Trả về ngày gần nhất là weekday (0=Mon, 6=Sun) trong tương lai."""
    today = datetime.now()
    days_ahead = (weekday - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


def ensure_group_class(
    admin_api: AilmsApi,
    course: dict[str, Any],
    teacher_id: str,
    pkg: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Tạo lớp GROUP_CLASS nếu chưa có; gán teacher; cập nhật lịch; tạo buổi học.
    Trả ClassResponse hoặc None nếu không thể tạo.
    """
    course_id = str(course["id"])
    existing = find_existing_group_class(admin_api, course_id)
    if existing:
        print(f"         [skip] Lớp nhóm đã tồn tại cho course {course_id}")
        return existing

    start_date = datetime.now() + timedelta(days=3)
    end_date = start_date + timedelta(days=90)

    class_body: dict[str, Any] = {
        "courseId": int(course_id),
        "categoryId": int(course.get("categoryId", 1)),
        "name": f"Lớp {course.get('name', 'Khóa học')[:40]}",
        "description": f"Lớp học nhóm cho khóa {course.get('name', '')}",
        "registrationOpen": True,
        "allowLateEnrollment": True,
        "packageType": "GROUP_CLASS",
        "maxMembers": 20,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
    }
    try:
        cls = admin_api.request("POST", "/v1/classes", json=class_body)
    except RuntimeError as ex:
        print(f"         [err] Tạo lớp course {course_id}: {ex}")
        return None

    class_id = cls["id"]

    # Gán teacher
    try:
        admin_api.request("POST", f"/v1/classes/{class_id}/members/{teacher_id}/join", params={"role": "TEACHER"})
    except RuntimeError as ex:
        print(f"         [warn] Gán teacher {teacher_id} vào lớp {class_id}: {ex}")

    # Cập nhật lịch học: Thứ 2, 4, 6 19:30-21:00
    schedules = [
        {"dayOfWeek": 1, "startTime": "19:30", "endTime": "21:00"},
        {"dayOfWeek": 3, "startTime": "19:30", "endTime": "21:00"},
        {"dayOfWeek": 5, "startTime": "19:30", "endTime": "21:00"},
    ]
    try:
        admin_api.request("PUT", f"/v1/classes/{class_id}/schedules", json=schedules)
    except RuntimeError as ex:
        print(f"         [warn] Cập nhật lịch lớp {class_id}: {ex}")

    # Tạo buổi học đầu tiên (Thứ 2 gần nhất 19:30)
    session_time = next_weekday(0).replace(hour=19, minute=30, second=0, microsecond=0)
    session_body = {
        "title": f"Buổi học đầu tiên - {course.get('name', '')[:30]}",
        "scheduledAt": session_time.isoformat(),
        "durationMin": 90,
        "meetingProvider": "GOOGLE_MEET",
        "meetingUrl": f"https://meet.google.com/seed-{class_id:04d}",
        "teacherNotes": "Buổi học mở đầu, giới thiệu chương trình và học viên.",
    }
    try:
        admin_api.request("POST", f"/v1/classes/{class_id}/sessions", json=session_body)
    except RuntimeError as ex:
        print(f"         [warn] Tạo session lớp {class_id}: {ex}")

    print(f"         [ok] Tạo lớp nhóm id={class_id} course={course_id} teacher={teacher_id}")
    return cls


def seed_group_classes(admin_api: AilmsApi) -> None:
    """Tạo lớp học nhóm cho các khóa có gói GROUP_CLASS ACTIVE."""
    courses = get_active_courses_with_category(admin_api)
    teachers = get_all_teachers(admin_api)
    if not teachers:
        print("   [warn] Không có teacher. Bỏ qua group class.")
        return

    created = 0
    for idx, course in enumerate(courses):
        cid = str(course["id"])
        pkgs = get_group_packages(admin_api, cid)
        if not pkgs:
            continue
        teacher = teachers[idx % len(teachers)]
        teacher_id = str(teacher["id"])
        cls = ensure_group_class(admin_api, course, teacher_id, pkgs[0])
        if cls and not cls.get("_existing"):
            created += 1
        time.sleep(0.2)

    print(f"   [group_class] {created} lớp nhóm mới tạo")


def get_pending_oo_requests(hr_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách yêu cầu 1-1 WAITING_INSTRUCTOR từ API HR để xử lý ghép giáo viên."""
    try:
        # Thử endpoint phân trang trước
        try:
            res = hr_api.request("GET", "/v1/hr/one-on-one/requests", params={"page": 0, "size": 100})
            reqs = res if isinstance(res, list) else res.get("content", [])
        except Exception:
            reqs = hr_api.request("GET", "/v1/hr/one-on-one/requests") or []
        return [r for r in reqs if r.get("status") == "WAITING_INSTRUCTOR"]
    except Exception as ex:
        print(f"   [warn] Không lấy được 1-1 requests: {ex}")
        return []


def notify_and_accept(
    hr_api: AilmsApi,
    teacher_api: AilmsApi,
    request_id: str,
    teacher_id: str,
) -> bool:
    """HR notify teacher → Teacher accept request (trả True nếu thành công)."""
    try:
        hr_api.request(
            "POST", f"/v1/hr/one-on-one/requests/{request_id}/notify-instructors",
            json={"instructorIds": [int(teacher_id)]},
        )
    except RuntimeError as ex:
        print(f"         [warn] notify req={request_id}: {ex}")

    try:
        teacher_api.request("POST", f"/v1/instructors/one-on-one/requests/{request_id}/accept")
        return True
    except RuntimeError as ex:
        print(f"         [warn] accept req={request_id}: {ex}")
        return False


def create_trial(hr_api: AilmsApi, request_id: str, idx: int) -> bool:
    """HR mark-contacted để tạo lớp và buổi trial 1-1 (thời gian đã qua để có thể review)."""
    start = datetime.now() - timedelta(hours=2)
    end = datetime.now() - timedelta(hours=1)
    trial_body = {
        "className": f"Lớp thử 1-1 #{idx}",
        "startAt": start.isoformat(),
        "endAt": end.isoformat(),
        "learningMode": "ONLINE",
        "linkOrLocation": "https://meet.google.com/seed-trial",
        "notes": "Buổi học thử được tạo bởi seed script.",
    }
    try:
        hr_api.request("POST", f"/v1/hr/one-on-one/requests/{request_id}/mark-contacted", json=trial_body)
        return True
    except RuntimeError as ex:
        print(f"         [warn] mark-contacted req={request_id}: {ex}")
        return False


def review_trial(teacher_api: AilmsApi, request_id: str) -> bool:
    """Teacher gửi nhận xét buổi học thử bắt buộc."""
    body = {
        "currentLevel": "Trung cấp, đã có nền tảng tốt",
        "weakAreas": "Cần cải thiện tư duy phân tích và debugging",
        "learningAttitude": "Tích cực, chủ động đặt câu hỏi, có tinh thần cầu tiến",
        "recommendedPath": "Nên bắt đầu từ bài thực hành nhỏ, tăng dần độ khó theo tuần",
        "additionalNotes": "Học viên có tiềm năng phát triển tốt trong 3 tháng tới.",
    }
    try:
        teacher_api.request("POST", f"/v1/instructors/one-on-one/requests/{request_id}/trial-review", json=body)
        return True
    except RuntimeError as ex:
        print(f"         [warn] trial-review req={request_id}: {ex}")
        return False


def student_accept_trial(student_api: AilmsApi, request_id: str) -> bool:
    """Student xác nhận tiếp tục học sau buổi thử (continueLearning=true)."""
    try:
        student_api.request(
            "POST", f"/v1/students/one-on-one/requests/{request_id}/trial-result",
            json={"continueLearning": True},
        )
        return True
    except RuntimeError as ex:
        print(f"         [warn] trial-result req={request_id}: {ex}")
        return False


def seed_one_on_one(admin_api: AilmsApi, base_url: str, password: str) -> None:
    """
    Hoàn tất quy trình 1-1 state machine cho các request WAITING_INSTRUCTOR:
    HR notify → Teacher accept → HR mark-contacted (tạo trial) → Teacher trial-review → Student trial-result.
    """
    teachers = get_all_teachers(admin_api)
    if not teachers:
        print("   [warn] Không có teacher. Bỏ qua one-on-one.")
        return

    # Cache danh sách student một lần để tránh gọi API lặp
    try:
        all_students_res = admin_api.request("GET", "/v1/users/page", params={
            "roleType": "STUDENT", "page": 0, "size": 100,
        })
        all_students = all_students_res.get("content", [])
    except Exception:
        all_students = []

    student_by_id: dict[str, dict] = {str(s["id"]): s for s in all_students}

    requests_list = get_pending_oo_requests(admin_api)
    if not requests_list:
        print("   [info] Không có yêu cầu 1-1 đang ở WAITING_INSTRUCTOR.")
        return

    print(f"   [info] Xử lý {len(requests_list)} yêu cầu 1-1 WAITING_INSTRUCTOR")
    done = 0
    for idx, req in enumerate(requests_list):
        req_id = str(req["id"])
        student_id = str(req.get("studentId") or req.get("userId") or "")

        # Phân công teacher theo round-robin
        teacher_user = teachers[idx % len(teachers)]
        t_api = AilmsApi(base_url)
        try:
            t_api.login(teacher_user.get("username") or teacher_user.get("email"), password)
        except Exception:
            print(f"         [warn] Không login được teacher {teacher_user.get('username')}")
            continue

        # Bước 1: HR notify → Teacher accept
        if not notify_and_accept(admin_api, t_api, req_id, str(teacher_user["id"])):
            continue
        time.sleep(0.3)

        # Bước 2: HR mark-contacted → tạo trial class (thời gian đã qua để review được ngay)
        if not create_trial(admin_api, req_id, idx):
            continue
        time.sleep(0.3)

        # Bước 3: Teacher trial-review
        if not review_trial(t_api, req_id):
            continue
        time.sleep(0.3)

        # Bước 4: Student trial-result (continueLearning=True → MATCHED)
        if student_id and student_id in student_by_id:
            student = student_by_id[student_id]
            s_api = AilmsApi(base_url)
            try:
                s_api.login(student.get("username") or student.get("email"), password)
                student_accept_trial(s_api, req_id)
                time.sleep(0.3)
            except Exception as ex:
                print(f"         [warn] Student trial-result req={req_id}: {ex}")

        done += 1
        print(f"         [ok] 1-1 req={req_id} → MATCHED (teacher={teacher_user.get('username')})")

    print(f"   [one_on_one] {done}/{len(requests_list)} yêu cầu hoàn tất")


def seed_class_lifecycle() -> None:
    """Điều phối seed lớp nhóm và quy trình 1-1."""
    base_url = os.getenv("AILMS_API_BASE_URL", "http://localhost:8080/api")
    password = os.getenv("AILMS_SEED_PASSWORD", "Password@123")
    admin_username = os.getenv("AILMS_SEED_ADMIN_USERNAME", "admin.report")
    admin_password = os.getenv("AILMS_SEED_ADMIN_PASSWORD", password)

    admin = AilmsApi(base_url)
    admin.login(admin_username, admin_password)

    print("   [class] Tạo lớp học nhóm...")
    seed_group_classes(admin)

    print("   [1-1] Hoàn tất quy trình 1-1...")
    seed_one_on_one(admin, base_url, password)
