"""
commerce_api.py
Sinh dữ liệu vòng đời thương mại:
  student checkout (tạo order PENDING) → admin-complete (cấp quyền đúng BE logic).
Không dùng PayPal Sandbox — gọi endpoint /v1/orders/{id}/admin-complete.
Mỗi student mua 3–5 gói học; idempotent khi chạy lại.
"""

from __future__ import annotations

import os
import random
import time
from datetime import datetime, timedelta
from typing import Any

from course_content_api import AilmsApi

COURSES_PER_STUDENT_MIN = 3
COURSES_PER_STUDENT_MAX = 5

# Trọng số lựa chọn delivery mode
DELIVERY_WEIGHTS = {"SELF_STUDY": 0.50, "GROUP_CLASS": 0.30, "ONE_ON_ONE": 0.20}

ONE_ON_ONE_NEEDS_POOL = [
    {
        "availablePeriod": "Buổi tối các ngày trong tuần",
        "availableDays": "Thứ 2; Thứ 4; Thứ 6",
        "preferredTimes": "19:00 - 21:00; 19:00 - 21:00; 19:00 - 21:00",
        "currentLevel": "Cơ bản, đã biết lý thuyết nhưng chưa thực hành nhiều",
        "learningSituation": "Tự học nhưng gặp khó khăn khi áp dụng vào dự án thực tế.",
        "learningGoals": "Nắm vững kỹ năng thực hành và tự tin đi làm trong lĩnh vực này.",
        "weakAreas": "Thiết kế kiến trúc, xử lý lỗi và viết unit test hiệu quả.",
        "instructorPreferences": "Giáo viên có kinh nghiệm thực tế tại doanh nghiệp.",
        "additionalNotes": "Muốn học theo dự án thực tế ngay từ đầu.",
    },
    {
        "availablePeriod": "Cuối tuần",
        "availableDays": "Thứ 7; Chủ nhật",
        "preferredTimes": "09:00 - 11:00; 09:00 - 11:00",
        "currentLevel": "Trung cấp, đã có kinh nghiệm 1 năm",
        "learningSituation": "Đang làm việc và muốn nâng cao trình độ lên level senior.",
        "learningGoals": "Nắm vững các pattern nâng cao và chuẩn bị phỏng vấn senior.",
        "weakAreas": "System design, microservices và tối ưu hiệu suất.",
        "instructorPreferences": "Giáo viên đang làm tech lead hoặc senior engineer.",
        "additionalNotes": "Có thể linh hoạt điều chỉnh lịch nếu cần.",
    },
    {
        "availablePeriod": "Buổi sáng",
        "availableDays": "Thứ 3; Thứ 5",
        "preferredTimes": "08:00 - 10:00; 08:00 - 10:00",
        "currentLevel": "Mới bắt đầu, chưa có kiến thức nền",
        "learningSituation": "Vừa tốt nghiệp và muốn chuyển sang lĩnh vực IT.",
        "learningGoals": "Xây dựng nền tảng vững chắc và tìm việc entry-level.",
        "weakAreas": "Toàn bộ kiến thức lập trình và cấu trúc dữ liệu.",
        "instructorPreferences": "Giáo viên kiên nhẫn với phương pháp sư phạm tốt cho người mới.",
        "additionalNotes": "Sẵn sàng học thêm ngoài giờ.",
    },
]


def get_all_students(admin_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách student ACTIVE từ API admin."""
    res = admin_api.request("GET", "/v1/users/page", params={
        "roleType": "STUDENT", "page": 0, "size": 100,
    })
    return res.get("content", [])


def get_active_courses(admin_api: AilmsApi) -> list[dict[str, Any]]:
    """Lấy danh sách khóa học ACTIVE từ backend."""
    courses = admin_api.request("GET", "/v1/courses")
    return [c for c in (courses or []) if c.get("status") == "ACTIVE"]


def get_active_packages(admin_api: AilmsApi, course_id: str) -> list[dict[str, Any]]:
    """Lấy danh sách gói học ACTIVE của một khóa học."""
    try:
        pkgs = admin_api.request("GET", f"/v1/course-packages/course/{course_id}")
        return [p for p in (pkgs or []) if p.get("status") == "ACTIVE"]
    except Exception:
        return []


def ensure_packages_for_course(admin_api: AilmsApi, course: dict[str, Any]) -> list[dict[str, Any]]:
    """Bảo đảm khóa học có đầy đủ các gói ACTIVE (SELF_STUDY, ONE_ON_ONE, GROUP_CLASS)."""
    cid = str(course["id"])
    cname = course.get("name", "Khóa học")
    pkgs = get_active_packages(admin_api, cid)
    existing_modes = {p.get("deliveryMode") for p in pkgs}

    if "SELF_STUDY" not in existing_modes:
        try:
            admin_api.request("POST", "/v1/course-packages", json={
                "courseId": int(cid),
                "name": f"Gói tự học - {cname}"[:100],
                "description": "Truy cập toàn bộ video, bài đọc, quiz và bài tập.",
                "price": 490000,
                "originalPrice": 690000,
                "deliveryMode": "SELF_STUDY",
                "durationDays": 180,
                "includedTutorSessions": 0,
            })
        except Exception:
            pass

    if "ONE_ON_ONE" not in existing_modes:
        try:
            admin_api.request("POST", "/v1/course-packages", json={
                "courseId": int(cid),
                "name": f"Gói kèm 1-1 - {cname}"[:100],
                "description": "Kèm 1-1 chuyên sâu cùng giảng viên hướng dẫn.",
                "price": 2490000,
                "originalPrice": 2990000,
                "deliveryMode": "ONE_ON_ONE",
                "durationDays": 60,
                "includedTutorSessions": 8,
            })
        except Exception:
            pass

    if "GROUP_CLASS" not in existing_modes:
        try:
            start_date = datetime.now() + timedelta(days=3)
            end_date = start_date + timedelta(days=90)
            cls = admin_api.request("POST", "/v1/classes", json={
                "courseId": int(cid),
                "categoryId": int(course.get("categoryId") or 1),
                "name": f"Lớp nhóm {cname}"[:40],
                "description": f"Lớp học nhóm {cname}",
                "registrationOpen": True,
                "allowLateEnrollment": True,
                "packageType": "GROUP_CLASS",
                "maxMembers": 20,
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
            })
            admin_api.request("POST", "/v1/course-packages", json={
                "courseId": int(cid),
                "classId": cls["id"],
                "name": f"Gói lớp nhóm - {cname}"[:100],
                "description": "Học nhóm trực tuyến tương tác 2 buổi/tuần.",
                "price": 1290000,
                "originalPrice": 1590000,
                "deliveryMode": "GROUP_CLASS",
                "durationDays": 90,
                "includedTutorSessions": 0,
            })
        except Exception:
            pass

    return get_active_packages(admin_api, cid)


def build_packages_map(admin_api: AilmsApi, courses: list[dict]) -> dict[str, list[dict]]:
    """Lập bản đồ course_id -> danh sách gói ACTIVE để tái sử dụng."""
    mapping: dict[str, list[dict]] = {}
    for course in courses:
        cid = str(course["id"])
        pkgs = ensure_packages_for_course(admin_api, course)
        if pkgs:
            mapping[cid] = pkgs
    return mapping


def pick_package(packages: list[dict], mode: str) -> dict | None:
    """Chọn gói học theo delivery mode ưu tiên, fallback sang SELF_STUDY."""
    pkg = next((p for p in packages if p.get("deliveryMode") == mode), None)
    if not pkg:
        pkg = next((p for p in packages if p.get("deliveryMode") == "SELF_STUDY"), None)
    return pkg or (packages[0] if packages else None)


def is_already_enrolled(student_api: AilmsApi, user_id: str, course_id: str) -> bool:
    """Kiểm tra enrollment thật của student theo user và course để chạy idempotent."""
    try:
        enrollments = student_api.request("GET", f"/v1/enrollments/user/{user_id}") or []
        return any(str(item.get("courseId")) == str(course_id) for item in enrollments)
    except Exception:
        return False


def random_order_date(rng: random.Random, days_back: int = 90) -> str:
    """
    Sinh ngày mua ngẫu nhiên trong [now - days_back, now] với phân phối weighted tăng dần.
    Gần đây nhiều hơn xa để mô phỏng growth curve tự nhiên.
    Trả về ISO string yyyy-MM-ddTHH:mm:ss để truyền vào backdateAt của admin-complete.
    """
    now = datetime.now()
    # Weight: d=1 gần nhất (cao), d=days_back xa nhất (thấp)
    weights = [1 + (1 - d / days_back) * 2 for d in range(1, days_back + 1)]
    days_ago = rng.choices(range(1, days_back + 1), weights=weights, k=1)[0]
    offset = timedelta(
        days=days_ago,
        hours=rng.randint(7, 22),
        minutes=rng.randint(0, 59),
        seconds=rng.randint(0, 59),
    )
    return (now - offset).strftime("%Y-%m-%dT%H:%M:%S")


def checkout_and_admin_complete(
    student_api: AilmsApi,
    admin_api: AilmsApi,
    package: dict[str, Any],
    needs: dict | None,
    coupon: str | None,
    order_rng: random.Random | None = None,
) -> dict[str, Any] | None:
    """
    Student checkout tạo order PENDING, Admin complete cấp quyền thật với ngày mua ngẫu nhiên.
    Trả None nếu đã enrolled (idempotent). backdateAt được sinh ngẫu nhiên trong 90 ngày qua
    để biểu đồ doanh thu hiển thị phân phối nhiều ngày thay vì cắm đứng 1 ngày.
    """
    payload: dict[str, Any] = {
        "coursePackageId": int(package["id"]),
        "acceptScheduleConflict": True,
    }
    if coupon:
        payload["couponCode"] = coupon
    if package.get("deliveryMode") == "ONE_ON_ONE" and needs:
        payload["oneOnOneNeeds"] = needs

    # Bước 1: Student tạo checkout order PENDING
    order_id = None
    try:
        checkout = student_api.request("POST", "/v1/orders/checkout", json=payload)
        order_id = checkout.get("orderId")
    except RuntimeError as ex:
        err = str(ex).lower()
        if any(k in err for k in ["enrolled", "ghi danh", "duplicate", "already"]):
            return None
        # 422 "đang chờ thanh toán" = có PENDING order cũ từ lần chạy trước bị 401
        # → Thử tìm PENDING order để admin-complete, nếu không tìm được thì skip (không raise)
        if "422" in str(ex) and ("chờ thanh toán" in err or "pending" in err or "giao dịch" in err):
            pkg_id = int(package["id"])
            try:
                orders = admin_api.request("GET", "/v1/orders")
                for o in (orders or []):
                    if o.get("status") != "PENDING":
                        continue
                    items = o.get("items") or o.get("orderItems") or []
                    for item in items:
                        if int(item.get("coursePackageId", 0)) == pkg_id or int(item.get("packageId", 0)) == pkg_id:
                            order_id = o["id"]
                            break
                    if order_id:
                        break
            except Exception:
                pass
            if not order_id:
                return None  # skip — PENDING tồn tại, không tạo mới được, bỏ qua
        else:
            raise

    if not order_id:
        return None  # skip — 422 pending không resolve được

    # Sinh ngày mua ngẫu nhiên trong 90 ngày qua
    backdate = random_order_date(order_rng or random.Random(int(order_id)))

    # Bước 2: Admin complete — provisionOrder thật, tăng enrollment_count, set paid_at=backdate
    try:
        result = admin_api.request(
            "POST", f"/v1/orders/{order_id}/admin-complete",
            params={"backdateAt": backdate},
        )
        return result
    except RuntimeError as ex:
        err = str(ex).lower()
        if any(k in err for k in ["paid", "already", "enrolled"]):
            return None
        # Admin token hết hạn — re-login rồi retry
        if "401" in str(ex):
            admin_api.login(
                os.getenv("AILMS_SEED_ADMIN_USERNAME", "admin.report"),
                os.getenv("AILMS_SEED_ADMIN_PASSWORD", os.getenv("AILMS_SEED_PASSWORD", "Password@123")),
            )
            result = admin_api.request(
                "POST", f"/v1/orders/{order_id}/admin-complete",
                params={"backdateAt": backdate},
            )
            return result
        raise


def get_coupons(admin_api: AilmsApi) -> list[str]:
    """Lấy tối đa 5 mã coupon ACTIVE để phân bổ ngẫu nhiên cho student."""
    if os.getenv("AILMS_SEED_USE_COUPONS", "false").lower() != "true":
        return []
    try:
        res = admin_api.request("GET", "/v1/coupons")
        items = res if isinstance(res, list) else res.get("content", [])
        return [c["code"] for c in items if c.get("code")][:5]
    except Exception:
        return []


def process_one_student(
    idx: int,
    student: dict[str, Any],
    base_url: str,
    password: str,
    admin_api: AilmsApi,
    packages_map: dict[str, list[dict]],
    course_ids: list[str],
    coupons: list[str],
) -> dict[str, int]:
    """
    Đăng nhập student, checkout 3–5 gói, admin complete từng order.
    Trả thống kê {success, skip, error}.
    """
    stats = {"success": 0, "skip": 0, "error": 0}
    username = student.get("username") or student.get("email")
    if not username:
        stats["error"] += 1
        return stats
    user_id = str(student["id"])

    student_api = AilmsApi(base_url)
    try:
        student_api.login(username, password)
    except RuntimeError as ex:
        print(f"      [err] login {username}: {ex}")
        stats["error"] += 1
        return stats

    # Cancel tất cả PENDING orders của student (qua admin) trước khi bắt đầu — idempotent khi chạy lại
    try:
        user_orders = admin_api.request("GET", f"/v1/orders/user/{user_id}") or []
        pending_mine = [o for o in user_orders if o.get("status") == "PENDING"]
        for o in pending_mine:
            try:
                admin_api.request("POST", f"/v1/orders/{o['id']}/cancel",
                                  params={"reason": "Seed cleanup: retry run"})
            except Exception:
                pass
        if pending_mine:
            time.sleep(0.3)
    except Exception:
        pass  # Không chặn nếu có lỗi gọi API

    rng = random.Random(idx * 7919 + 42)
    count = rng.randint(COURSES_PER_STUDENT_MIN, COURSES_PER_STUDENT_MAX)

    shuffled = list(course_ids)
    rng.shuffle(shuffled)
    used: set[str] = set()

    for cid in shuffled:
        if len(used) >= count:
            break
        if cid in used or cid not in packages_map:
            continue

        # Kiểm tra idempotent trước khi checkout
        if is_already_enrolled(student_api, user_id, cid):
            stats["skip"] += 1
            used.add(cid)
            continue

        modes = list(DELIVERY_WEIGHTS.keys())
        mode = rng.choices(modes, weights=list(DELIVERY_WEIGHTS.values()), k=1)[0]
        pkg = pick_package(packages_map[cid], mode)
        if not pkg:
            continue

        needs = rng.choice(ONE_ON_ONE_NEEDS_POOL) if pkg.get("deliveryMode") == "ONE_ON_ONE" else None
        coupon = rng.choice(coupons) if coupons and rng.random() < 0.20 else None

        try:
            result = checkout_and_admin_complete(student_api, admin_api, pkg, needs, coupon, rng)
            if result is None:
                stats["skip"] += 1
            else:
                order_status = result.get("status", "PAID") if isinstance(result, dict) else "PAID"
                print(f"         [ok] course={cid} mode={pkg.get('deliveryMode')} status={order_status}")
                stats["success"] += 1
            used.add(cid)
            time.sleep(0.4)
        except RuntimeError as ex:
            err_str = str(ex)
            # 401 — student token hết hạn; re-login rồi retry ngay
            if "401" in err_str:
                try:
                    student_api.login(username, password)
                    result = checkout_and_admin_complete(student_api, admin_api, pkg, needs, coupon, rng)
                    if result is None:
                        stats["skip"] += 1
                    else:
                        order_status = result.get("status", "PAID") if isinstance(result, dict) else "PAID"
                        print(f"         [ok] course={cid} mode={pkg.get('deliveryMode')} status={order_status} (re-auth)")
                        stats["success"] += 1
                    used.add(cid)
                    time.sleep(0.4)
                    continue
                except RuntimeError as retry_ex:
                    print(f"         [err] course={cid} re-auth failed: {retry_ex}")
                    stats["error"] += 1
                time.sleep(0.5)
                continue
            # 500 / ConnectionError — thử fallback SELF_STUDY
            if "500" in err_str or "internal server error" in err_str.lower() or "ConnectionError" in err_str:
                print(f"         [warn] course={cid} 500/conn error, trying SELF_STUDY fallback...")
                if pkg.get("deliveryMode") != "SELF_STUDY":
                    ss_pkg = pick_package(packages_map[cid], "SELF_STUDY")
                    if ss_pkg and ss_pkg.get("id") != pkg.get("id"):
                        try:
                            result = checkout_and_admin_complete(student_api, admin_api, ss_pkg, None, None, rng)
                            if result is not None:
                                print(f"         [ok] course={cid} mode=SELF_STUDY (fallback) status=PAID")
                                stats["success"] += 1
                                used.add(cid)
                                time.sleep(0.4)
                                continue
                        except RuntimeError:
                            pass
                stats["error"] += 1
                used.add(cid)
            else:
                print(f"         [err] course={cid}: {ex}")
                stats["error"] += 1
            time.sleep(0.5)

    return stats


def seed_commerce() -> None:
    """Điều phối pipeline mua hàng cho toàn bộ student đã seed."""
    base_url = os.getenv("AILMS_API_BASE_URL", "http://localhost:8080/api")
    password = os.getenv("AILMS_SEED_PASSWORD", "Password@123")
    admin_username = os.getenv("AILMS_SEED_ADMIN_USERNAME", "admin.report")
    admin_password = os.getenv("AILMS_SEED_ADMIN_PASSWORD", password)

    admin = AilmsApi(base_url)
    admin.login(admin_username, admin_password)

    students = get_all_students(admin)
    if not students:
        raise RuntimeError("Không có student! Hãy chạy phase identity trước.")

    courses = get_active_courses(admin)
    if not courses:
        raise RuntimeError("Không có khóa học ACTIVE! Hãy chạy phase course-content trước.")

    print(f"   [info] {len(students)} student, {len(courses)} ACTIVE course")
    packages_map = build_packages_map(admin, courses)
    course_ids = list(packages_map.keys())
    print(f"   [info] {len(course_ids)} course có gói ACTIVE")

    coupons = get_coupons(admin)
    if coupons:
        print(f"   [info] Dùng {len(coupons)} mã coupon: {coupons}")

    # AILMS_COMMERCE_STUDENTS_LIMIT=0 => tất cả student
    limit = int(os.getenv("AILMS_COMMERCE_STUDENTS_LIMIT", "0"))
    target_students = students[:limit] if limit > 0 else students
    print(f"   [info] Xử lý {len(target_students)} student")

    total_ok = total_skip = total_err = 0
    for idx, student in enumerate(target_students):
        uname = student.get("username") or student.get("email", "?")
        print(f"   → [{idx+1}/{len(target_students)}] {uname}")
        stats = process_one_student(
            idx, student, base_url, password, admin, packages_map, course_ids, coupons,
        )
        total_ok += stats["success"]
        total_skip += stats["skip"]
        total_err += stats["error"]

    print(f"   [commerce] OK={total_ok} skip={total_skip} err={total_err}")
