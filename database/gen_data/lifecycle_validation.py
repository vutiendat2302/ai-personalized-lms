"""
lifecycle_validation.py
Kiểm toán và xuất báo cáo chất lượng dữ liệu sau khi chạy pipeline learner-lifecycle.
Không query MySQL trực tiếp; toàn bộ kiểm tra qua Backend API.
"""

from __future__ import annotations

import os
from typing import Any

from course_content_api import AilmsApi


def check_courses(admin_api: AilmsApi) -> tuple[bool, str]:
    """Kiểm tra có khóa học theo các trạng thái (ACTIVE, DRAFT, PENDING, REJECTED)."""
    courses = admin_api.request("GET", "/v1/courses") or []
    counts: dict[str, int] = {}
    for c in courses:
        st = c.get("status", "UNKNOWN")
        counts[st] = counts.get(st, 0) + 1

    ok = counts.get("ACTIVE", 0) >= 3
    detail = " | ".join(f"{s}={counts.get(s, 0)}" for s in ["ACTIVE", "DRAFT", "PENDING", "REJECTED"])
    return ok, detail


def check_students(admin_api: AilmsApi) -> tuple[bool, str]:
    """Kiểm tra có đủ 50 student ACTIVE."""
    res = admin_api.request("GET", "/v1/users/page", params={"roleType": "STUDENT", "page": 0, "size": 1})
    total = res.get("totalElements", 0)
    return total >= 50, f"total={total}"


def check_packages(admin_api: AilmsApi) -> tuple[bool, str]:
    """Kiểm tra có gói học ACTIVE để bán được."""
    try:
        res = admin_api.request("GET", "/v1/course-packages/stats")
        active = res.get("activePackages", 0) or res.get("activeCount", 0) or res.get("active", 0)
        ok = active >= 3
        return ok, f"active_packages={active}"
    except Exception as ex:
        return False, f"Không lấy được stats: {ex}"


def check_orders(admin_api: AilmsApi) -> tuple[bool, str]:
    """Kiểm tra có ít nhất 1 đơn hàng PAID từ payment flow thật."""
    try:
        orders = admin_api.request("GET", "/v1/orders")
        all_orders = orders or []
        paid = [o for o in all_orders if o.get("status") == "PAID"]
        ok = len(paid) >= 1
        return ok, f"paid_orders={len(paid)} / total={len(all_orders)}"
    except Exception as ex:
        return False, f"Lỗi lấy orders: {ex}"


def check_reviews(admin_api: AilmsApi) -> tuple[bool, str]:
    """Kiểm tra có ít nhất 1 review thật từ student đã enrolled."""
    try:
        res = admin_api.request("GET", "/v1/reviews/search", params={"page": 0, "size": 1})
        total = res.get("totalElements", 0)
        ok = total >= 1
        return ok, f"total_reviews={total}"
    except Exception as ex:
        return False, f"Lỗi lấy reviews: {ex}"


def check_sample_enrollment(admin_api: AilmsApi) -> tuple[bool, str]:
    """
    Kiểm tra thật có enrollment trong DB: lấy student đầu tiên và query enrollment của họ.
    Không chỉ check có student + active course.
    """
    try:
        res = admin_api.request("GET", "/v1/users/page", params={"roleType": "STUDENT", "page": 0, "size": 5})
        students = res.get("content", [])
        if not students:
            return False, "Không có student"

        # Kiểm tra thật có enrollment trong DB
        total_enrolled = 0
        for student in students[:5]:
            uid = str(student["id"])
            try:
                enrs = admin_api.request("GET", f"/v1/enrollments/user/{uid}") or []
                total_enrolled += len(enrs)
            except Exception:
                pass

        ok = total_enrolled >= 1
        return ok, f"sample_students={len(students)}, total_enrollments_sampled={total_enrolled}"
    except Exception as ex:
        return False, f"Lỗi: {ex}"


def check_class_lifecycle(admin_api: AilmsApi) -> tuple[bool, str]:
    """Kiểm tra có lớp học GROUP_CLASS được tạo."""
    try:
        classes = admin_api.request("GET", "/v1/classes")
        group_classes = [c for c in (classes or []) if c.get("packageType") == "GROUP_CLASS"]
        ok = len(group_classes) >= 1
        return ok, f"group_classes={len(group_classes)}"
    except Exception as ex:
        return False, f"Lỗi lấy classes: {ex}"


def run_validation() -> dict[str, Any]:
    """
    Chạy toàn bộ kiểm tra và in báo cáo tổng hợp.
    Trả dict kết quả để main.py có thể xử lý.
    """
    base_url = os.getenv("AILMS_API_BASE_URL", "http://localhost:8080/api")
    password = os.getenv("AILMS_SEED_PASSWORD", "Password@123")
    admin_username = os.getenv("AILMS_SEED_ADMIN_USERNAME", "admin.report")
    admin_password = os.getenv("AILMS_SEED_ADMIN_PASSWORD", password)

    admin = AilmsApi(base_url)
    try:
        admin.login(admin_username, admin_password)
    except RuntimeError as ex:
        print(f"   [FAIL] Không login được admin: {ex}")
        return {"passed": 0, "failed": 1, "checks": {}}

    checks = {
        "courses": check_courses,
        "students": check_students,
        "packages": check_packages,
        "orders": check_orders,
        "reviews": check_reviews,
        "sample_enrollment": check_sample_enrollment,
        "class_lifecycle": check_class_lifecycle,
    }

    results: dict[str, Any] = {}
    passed = failed = 0

    print("\n   ── Báo cáo Lifecycle Validation ──────────────────────────")
    for name, fn in checks.items():
        try:
            ok, detail = fn(admin)
        except Exception as ex:
            ok, detail = False, str(ex)

        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"   {status}  [{name}] {detail}")
        results[name] = {"ok": ok, "detail": detail}
        if ok:
            passed += 1
        else:
            failed += 1

    print(f"\n   ── Tổng kết: {passed} PASS / {failed} FAIL ─────────────────")
    if failed == 0:
        print("   🎉 Toàn bộ kiểm tra PASS. Dữ liệu sẵn sàng cho demo.")
    else:
        print("   ⚠️  Có kiểm tra FAIL. Xem chi tiết ở trên để xử lý.")

    return {"passed": passed, "failed": failed, "checks": results}
