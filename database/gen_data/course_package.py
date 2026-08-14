"""
course_package.py
------------------
Seed dữ liệu cho bảng `course_package` (Gói học).
Tạo các gói học thực tế cho từng khóa học (Gói Tự Học, Gói Lớp Online, Gói Hybrid, Gói Kèm 1-1).
"""

import random
import uuid
from datetime import datetime
from snowflake_id import snowflake

random.seed(2026)

PACKAGE_TEMPLATES = [
    {
        "name": "Gói Tự Học Standard (Lifetime)",
        "delivery_mode": "SELF_STUDY",
        "price_factor": 0.7,
        "duration_days": 365,
        "included_tutor_sessions": 0,
        "max_group_size": None,
        "description": "Truy cập video trọn đời, tự học theo lộ trình cá nhân hóa, làm quiz & bài tập tự động.",
    },
    {
        "name": "Gói Lớp Online Live Class",
        "delivery_mode": "GROUP_CLASS",
        "price_factor": 0.85,
        "duration_days": 90,
        "included_tutor_sessions": 4,
        "max_group_size": 25,
        "description": "Học trực tuyến qua video conference 2 buổi/tuần với giảng viên, giải đáp thắc mắc trực tiếp.",
    },
    {
        "name": "Gói Lớp Hybrid 2026",
        "delivery_mode": "COMBO",
        "price_factor": 0.9,
        "duration_days": 180,
        "included_tutor_sessions": 8,
        "max_group_size": 15,
        "description": "Kết hợp tự học video linh hoạt + 1 buổi review trực tuyến hàng tuần + chữa bài 1-1.",
    },
    {
        "name": "Gói Kèm 1-1 Chuyên Sâu Pro",
        "delivery_mode": "ONE_ON_ONE",
        "price_factor": 1.0,
        "duration_days": 120,
        "included_tutor_sessions": 16,
        "max_group_size": 1,
        "description": "1 Mentor kèm riêng 1-1 suốt lộ trình, review code từng commit, hỗ trợ tư vấn tuyển dụng & CV.",
    },
]


def _package_code_exists(cursor, code):
    """Kiểm tra mã gói đã tồn tại trước khi sinh dữ liệu."""
    cursor.execute("SELECT 1 FROM course_package WHERE code=%s LIMIT 1", (code,))
    return cursor.fetchone() is not None


def _generate_package_code(cursor):
    """Sinh mã gói tương thích định dạng CodeGenerator của backend."""
    yy_mm = datetime.now().strftime("%y%m")
    for _ in range(10):
        candidate = f"CP-{yy_mm}-{uuid.uuid4().hex[:6].upper()}"
        if not _package_code_exists(cursor, candidate):
            return candidate
    raise RuntimeError("Tao ma code that bai CP sau 10 lan")


def _backfill_package_data(cursor):
    """Bổ sung mã, audit và liên kết lớp cho các gói cũ do seeder tạo thiếu dữ liệu."""
    cursor.execute("SELECT id FROM course_package WHERE code IS NULL OR TRIM(code) = ''")
    rows = cursor.fetchall()
    for row in rows:
        cursor.execute(
            "UPDATE course_package SET code=%s WHERE id=%s",
            (_generate_package_code(cursor), row["id"]),
        )

    cursor.execute(
        """
        UPDATE course_package cp
        JOIN course c ON c.id = cp.course_id
        SET cp.created_by = COALESCE(cp.created_by, c.created_by),
            cp.updated_by = COALESCE(cp.updated_by, cp.created_by, c.updated_by, c.created_by)
        WHERE cp.created_by IS NULL OR cp.updated_by IS NULL
        """
    )

    cursor.execute(
        """
        SELECT id, course_id, delivery_mode, status
        FROM course_package
        WHERE class_id IS NULL
          AND (delivery_mode='GROUP_CLASS'
               OR (delivery_mode='COMBO' AND COALESCE(max_group_size, 0) > 1))
        ORDER BY created_at, id
        """
    )
    malformed_packages = cursor.fetchall()
    repaired_count = 0
    deactivated_count = 0
    for package in malformed_packages:
        cursor.execute(
            """
            SELECT c.id
            FROM class c
            WHERE c.course_id=%s
              AND c.status='ACTIVE'
            ORDER BY COALESCE(c.registration_open, 0) DESC, c.start_date, c.id
            LIMIT 1
            """,
            (package["course_id"],),
        )
        available_class = cursor.fetchone()
        if available_class:
            cursor.execute(
                "UPDATE course_package SET class_id=%s, updated_at=NOW() WHERE id=%s",
                (available_class["id"], package["id"]),
            )
            repaired_count += 1
        elif package["delivery_mode"] == "COMBO":
            cursor.execute(
                "UPDATE course_package SET max_group_size=NULL, updated_at=NOW() WHERE id=%s",
                (package["id"],),
            )
        elif package["status"] == "ACTIVE":
            cursor.execute(
                "UPDATE course_package SET status='INACTIVE', updated_at=NOW() WHERE id=%s",
                (package["id"],),
            )
            deactivated_count += 1
    return len(rows), repaired_count, deactivated_count


def seed(cursor):
    """Tạo và bổ sung dữ liệu gói học hợp lệ theo schema hiện tại."""
    print("→ Seeding course_package...")
    backfilled_count, repaired_class_count, deactivated_count = _backfill_package_data(cursor)
    cursor.execute("SELECT id, name, created_by, updated_by FROM course LIMIT 50")
    courses = cursor.fetchall()

    if not courses:
        print("   [warning] Bảng course chưa có dữ liệu, bỏ qua seed course_package")
        return

    inserted_count = 0
    for course in courses:
        course_id = course["id"]
        course_name = course["name"]

        # Kiểm tra xem khóa học này đã có gói học nào chưa
        cursor.execute("SELECT COUNT(*) as cnt FROM course_package WHERE course_id = %s", (course_id,))
        if cursor.fetchone()["cnt"] > 0:
            continue

        base_price = random.choice([2500000, 3500000, 4500000, 5500000, 6500000])

        cursor.execute(
            """
            SELECT c.id
            FROM class c
            WHERE c.course_id=%s AND c.status='ACTIVE'
            ORDER BY COALESCE(c.registration_open, 0) DESC, c.start_date, c.id
            LIMIT 1
            """,
            (course_id,),
        )
        available_class = cursor.fetchone()
        class_id = available_class["id"] if available_class else None
        independent_templates = [
            tpl for tpl in PACKAGE_TEMPLATES
            if tpl["delivery_mode"] in ("SELF_STUDY", "ONE_ON_ONE")
        ]
        class_backed_templates = [
            tpl for tpl in PACKAGE_TEMPLATES
            if tpl["delivery_mode"] in ("GROUP_CLASS", "COMBO")
        ]
        chosen_templates = random.sample(independent_templates, k=len(independent_templates))
        if class_id is not None:
            chosen_templates.extend(class_backed_templates)
        for tpl in chosen_templates:
            pkg_id = snowflake.next_id()
            package_code = _generate_package_code(cursor)
            selling_price = int(base_price * tpl["price_factor"])
            original_price = int(selling_price * 1.25)
            status = random.choice(["ACTIVE", "ACTIVE", "ACTIVE", "INACTIVE"])

            cursor.execute(
                """
                INSERT INTO course_package (
                    id, code, course_id, class_id, name, description, delivery_mode,
                    price, original_price, duration_days, included_tutor_sessions,
                    max_group_size, status, created_at, updated_at, created_by, updated_by
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s, %s)
                """,
                (
                    pkg_id,
                    package_code,
                    course_id,
                    class_id if tpl["delivery_mode"] in ("GROUP_CLASS", "COMBO") else None,
                    f"{tpl['name']} - {course_name[:30]}",
                    tpl["description"],
                    tpl["delivery_mode"],
                    selling_price,
                    original_price,
                    tpl["duration_days"],
                    tpl["included_tutor_sessions"],
                    tpl["max_group_size"],
                    status,
                    course["created_by"],
                    course["updated_by"] or course["created_by"],
                ),
            )
            inserted_count += 1

    print(f"   [backfill] Đã bổ sung mã cho {backfilled_count} gói học cũ")
    print(f"   [repair] Đã gắn lớp cho {repaired_class_count} gói và vô hiệu hóa {deactivated_count} gói thiếu lớp")
    print(f"   [insert] Đã tạo thành công {inserted_count} gói học trong `course_package`")
