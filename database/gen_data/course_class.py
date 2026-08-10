"""Seed dữ liệu tích hợp Course/Class Management để kiểm thử giao diện Admin.

Seeder dùng các category, course, employee và student_profile có sẵn; không tạo
ID giả hoặc tham chiếu cứng. Có thể chạy lại an toàn vì mỗi nhóm dữ liệu đều
được kiểm tra trước khi insert.
"""

import random
import uuid
from datetime import datetime, timedelta, time
from decimal import Decimal

from snowflake_id import snowflake


random.seed(20260801)

DAY_SLOTS = [
    ((1, time(18, 30), time(20, 30)), (3, time(18, 30), time(20, 30))),
    ((2, time(19, 0), time(21, 0)), (4, time(19, 0), time(21, 0))),
    ((6, time(8, 0), time(10, 0)), (7, time(8, 0), time(10, 0))),
]


def _class_code_exists(cursor, code):
    return _exists(cursor, "SELECT 1 FROM class WHERE code=%s LIMIT 1", (code,))


def _class_online_code_exists(cursor, code):
    return _exists(cursor, "SELECT 1 FROM class_online WHERE code=%s LIMIT 1", (code,))


def _generate_class_code(cursor):
    yy_mm = datetime.now().strftime("%y%m")
    for _ in range(10):
        random_part = uuid.uuid4().hex[:6].upper()
        candidate = f"LH-{yy_mm}-{random_part}"
        if not _class_code_exists(cursor, candidate):
            return candidate
    raise RuntimeError("Tao ma code that bai LH sau 10 lan")


def _generate_class_online_code(cursor):
    yy_mm = datetime.now().strftime("%y%m")
    for _ in range(10):
        random_part = uuid.uuid4().hex[:6].upper()
        candidate = f"BH-{yy_mm}-{random_part}"
        if not _class_online_code_exists(cursor, candidate):
            return candidate
    raise RuntimeError("Tao ma code that bai BH sau 10 lan")


def _package_code_exists(cursor, code):
    """Kiểm tra mã gói đã tồn tại trong dữ liệu hiện hành."""
    return _exists(cursor, "SELECT 1 FROM course_package WHERE code=%s LIMIT 1", (code,))


def _generate_package_code(cursor):
    """Sinh mã gói tương thích CodeGenerator của backend."""
    yy_mm = datetime.now().strftime("%y%m")
    for _ in range(10):
        candidate = f"CP-{yy_mm}-{uuid.uuid4().hex[:6].upper()}"
        if not _package_code_exists(cursor, candidate):
            return candidate
    raise RuntimeError("Tao ma code that bai CP sau 10 lan")


def _backfill_class_online_codes(cursor):
    cursor.execute("SELECT id FROM class_online WHERE code IS NULL OR TRIM(code) = ''")
    rows = cursor.fetchall()
    for row in rows:
        cursor.execute(
            "UPDATE class_online SET code=%s, updated_at=%s WHERE id=%s",
            (_generate_class_online_code(cursor), datetime.now(), row["id"]),
        )
    return len(rows)


def _fetch_all(cursor, query, params=()):
    cursor.execute(query, params)
    return cursor.fetchall()


def _exists(cursor, query, params):
    cursor.execute(query, params)
    return cursor.fetchone() is not None


def _insert_package(cursor, course, name, mode, price, duration, class_id=None):
    if _exists(
        cursor,
        "SELECT 1 FROM course_package WHERE course_id=%s AND name=%s LIMIT 1",
        (course["id"], name),
    ):
        return 0

    now = datetime.now()
    cursor.execute(
        """
        INSERT INTO course_package (
            id, code, course_id, class_id, name, description, delivery_mode,
            price, original_price, duration_days, included_tutor_sessions,
            max_group_size, status, created_at, updated_at, created_by, updated_by
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'ACTIVE',%s,%s,%s,%s)
        """,
        (
            snowflake.next_id(), _generate_package_code(cursor), course["id"], class_id, name,
            f"Gói {name} dành cho khóa học {course['name']}", mode,
            price, (price * Decimal("1.15")).quantize(Decimal("1")), duration,
            8 if mode == "ONE_ON_ONE" else 0,
            15 if mode == "GROUP_CLASS" else None,
            now, now, course["created_by"], course["created_by"],
        ),
    )
    return 1


def _insert_member(cursor, class_id, user_id, role, status, joined_at=None, waitlisted_at=None):
    if _exists(
        cursor,
        "SELECT 1 FROM class_member WHERE class_id=%s AND user_id=%s LIMIT 1",
        (class_id, user_id),
    ):
        return 0
    now = datetime.now()
    cursor.execute(
        """
        INSERT INTO class_member (
            class_id, user_id, role_in_class, status, joined_at,
            waitlisted_at, left_at, created_at, updated_at, created_by, updated_by
        ) VALUES (%s,%s,%s,%s,%s,%s,NULL,%s,%s,%s,%s)
        """,
        (class_id, user_id, role, status, joined_at, waitlisted_at, now, now, user_id, user_id),
    )
    return 1


def _assign_course_teacher(cursor, course_id, user_id, assigned_by):
    if _exists(
        cursor,
        "SELECT 1 FROM course_teacher WHERE course_id=%s AND user_id=%s LIMIT 1",
        (course_id, user_id),
    ):
        return 0
    cursor.execute(
        """
        INSERT INTO course_teacher (course_id, user_id, assigned_at, assigned_by)
        VALUES (%s,%s,%s,%s)
        """,
        (course_id, user_id, datetime.now() - timedelta(days=35), assigned_by),
    )
    return 1


def _get_or_create_enrollment(cursor, course_id, class_id, user_id, status, enrolled_at):
    """Enrollment là nguồn ghi danh; class_member chỉ phản chiếu việc xếp lớp."""
    cursor.execute(
        """
        SELECT id, user_id, class_id FROM enrollment
        WHERE course_id=%s AND user_id=%s LIMIT 1
        """,
        (course_id, user_id),
    )
    existing = cursor.fetchone()
    if existing:
        cursor.execute(
            """
            UPDATE enrollment SET class_id=%s, status=%s, updated_at=%s, updated_by=%s
            WHERE id=%s
            """,
            (class_id, status, datetime.now(), user_id, existing["id"]),
        )
        return {"id": existing["id"], "user_id": existing["user_id"], "class_id": class_id}, 0

    enrollment_id = snowflake.next_id()
    now = datetime.now()
    cursor.execute(
        """
        INSERT INTO enrollment (
            id, user_id, course_id, class_id, status, enrolled_at, completed_at,
            created_at, updated_at, created_by, updated_by
        ) VALUES (%s,%s,%s,%s,%s,%s,NULL,%s,%s,%s,%s)
        """,
        (
            enrollment_id, user_id, course_id, class_id, status, enrolled_at,
            now, now, user_id, user_id,
        ),
    )
    return {"id": enrollment_id, "user_id": user_id, "class_id": class_id}, 1


def _seed_schedules(cursor, class_id, slots, actor_id):
    inserted = 0
    now = datetime.now()
    for day, start, end in slots:
        if _exists(
            cursor,
            "SELECT 1 FROM class_schedule WHERE class_id=%s AND day_of_week=%s AND start_time=%s LIMIT 1",
            (class_id, day, start),
        ):
            continue
        cursor.execute(
            """
            INSERT INTO class_schedule (
                id, class_id, day_of_week, start_time, end_time, status,
                created_at, updated_at, created_by, updated_by
            ) VALUES (%s,%s,%s,%s,%s,'ACTIVE',%s,%s,%s,%s)
            """,
            (snowflake.next_id(), class_id, day, start, end, now, now, actor_id, actor_id),
        )
        inserted += 1
    return inserted


def _seed_online_sessions(cursor, class_id, teacher_id, slots, start_date, actor_id):
    if _exists(cursor, "SELECT 1 FROM class_online WHERE class_id=%s LIMIT 1", (class_id,)):
        return 0
    inserted = 0
    today = datetime.now().date()
    base_date = max(start_date.date() if start_date else today, today - timedelta(days=14))
    for week in range(-2, 5):
        for day, start, end in slots:
            target = base_date + timedelta(days=week * 7)
            target += timedelta(days=(day - target.isoweekday()) % 7)
            scheduled_at = datetime.combine(target, start)
            duration = int((datetime.combine(target, end) - scheduled_at).total_seconds() / 60)
            status = "INACTIVE" if scheduled_at < datetime.now() - timedelta(days=1) else "ACTIVE"
            cursor.execute(
                """
                INSERT INTO class_online (
                    id, code, class_id, teacher_id, title, meeting_url, meeting_provider, scheduled_at,
                    duration_min, status, created_at, updated_at, created_by, updated_by
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    snowflake.next_id(), _generate_class_online_code(cursor), class_id, teacher_id,
                    f"Buổi học trực tuyến - {target.strftime('%d/%m/%Y')}",
                    f"https://meet.google.com/ailms-{class_id}", "GOOGLE_MEET", scheduled_at,
                    duration, status, datetime.now(), datetime.now(), actor_id, actor_id,
                ),
            )
            inserted += 1
    return inserted


def seed(cursor):
    print("→ Seeding dữ liệu tích hợp Course/Class Management...")

    # Backfill quan hệ tác giả/phụ trách cho toàn bộ course, kể cả khi course.py
    # đã skip vì database có đủ dữ liệu từ lần chạy trước.
    course_authors = _fetch_all(
        cursor,
        """
        SELECT c.id AS course_id, c.created_by AS teacher_id
        FROM course c
        JOIN employee e ON e.user_id=c.created_by
        WHERE c.created_by IS NOT NULL
        ORDER BY c.id
        """,
    )
    assigned_course_teachers = 0
    for author in course_authors:
        assigned_course_teachers += _assign_course_teacher(
            cursor, author["course_id"], author["teacher_id"], author["teacher_id"],
        )

    courses = _fetch_all(
        cursor,
        """
        SELECT c.id, c.category_id, c.name, c.suggested_price, c.created_by
        FROM course c
        WHERE c.status='ACTIVE'
        ORDER BY c.created_at DESC
        LIMIT 60
        """,
    )
    students = _fetch_all(cursor, "SELECT user_id FROM student_profile ORDER BY user_id LIMIT 500")
    teacher_links = _fetch_all(
        cursor,
        """
        SELECT employee_id, category_id FROM teacher_category
        WHERE status='ACTIVE' AND unassigned_at IS NULL
        ORDER BY category_id, employee_id
        """,
    )
    teachers_by_category = {}
    for row in teacher_links:
        teachers_by_category.setdefault(row["category_id"], []).append(row["employee_id"])

    if not courses:
        print("   [warning] Không có course ACTIVE. Hãy chạy course.seed() trước.")
        return
    if not students:
        print("   [warning] Không có student_profile. Hãy chạy student_profile.seed() trước.")
        return

    stats = {
        "classes": 0, "packages": 0, "course_teachers": 0,
        "enrollments": 0, "members": 0, "schedules": 0, "sessions": 0,
    }
    stats["course_teachers"] = assigned_course_teachers
    stats["online_codes_backfilled"] = _backfill_class_online_codes(cursor)
    student_ids = [row["user_id"] for row in students]

    for index, course in enumerate(courses):
        teachers = teachers_by_category.get(course["category_id"], [])
        if not teachers:
            continue
        teacher_id = course["created_by"] if course["created_by"] in teachers else teachers[index % len(teachers)]
        ta_candidates = [candidate for candidate in teachers if candidate != teacher_id]
        ta_id = ta_candidates[index % len(ta_candidates)] if ta_candidates and index % 3 != 0 else None
        price = Decimal(course["suggested_price"] or random.randrange(800, 4500, 100) * 1000)

        # Người tạo khóa học luôn là giảng viên phụ trách; có thể có thêm TA/co-teacher.
        stats["course_teachers"] += _assign_course_teacher(
            cursor, course["id"], teacher_id, teacher_id,
        )
        if ta_id is not None:
            stats["course_teachers"] += _assign_course_teacher(
                cursor, course["id"], ta_id, teacher_id,
            )

        stats["packages"] += _insert_package(
            cursor, course, "Gói Tự Học Trọn Đời", "SELF_STUDY",
            (price * Decimal("0.55")).quantize(Decimal("1")), 365,
        )
        stats["packages"] += _insert_package(
            cursor, course, "Gói Gia Sư 1 Kèm 1", "ONE_ON_ONE",
            (price * Decimal("1.8")).quantize(Decimal("1")), 90,
        )

        cursor.execute("SELECT id, code FROM class WHERE course_id=%s AND package_type='GROUP_CLASS' LIMIT 1", (course["id"],))
        existing = cursor.fetchone()
        if existing:
            class_id = existing["id"]
            if not existing.get("code"):
                cursor.execute(
                    "UPDATE class SET code=%s, updated_at=%s, updated_by=%s WHERE id=%s",
                    (_generate_class_code(cursor), datetime.now(), teacher_id, class_id),
                )
        else:
            class_id = snowflake.next_id()
            class_code = _generate_class_code(cursor)
            start_date = datetime.now() + timedelta(days=random.randint(-20, 20))
            end_date = start_date + timedelta(days=random.choice([60, 75, 90]))
            capacity = random.choice([10, 12, 15, 20])
            cursor.execute(
                """
                INSERT INTO class (
                    id, code, course_id, category_id, name, package_type, type,
                    max_members, current_member_count, status, start_date, end_date,
                    created_at, updated_at, created_by, updated_by
                ) VALUES (%s,%s,%s,%s,%s,'GROUP_CLASS',0,%s,0,'ACTIVE',%s,%s,%s,%s,%s,%s)
                """,
                (
                    class_id, class_code, course["id"], course["category_id"],
                    f"{course['name'][:70]} - Lớp K{index + 1:02d}", capacity,
                    start_date, end_date, datetime.now(), datetime.now(), teacher_id, teacher_id,
                ),
            )
            stats["classes"] += 1

        cursor.execute(
            """SELECT user_id FROM class_member
               WHERE class_id=%s AND role_in_class IN ('TEACHER','TA') AND status='ACTIVE'
               ORDER BY CASE role_in_class WHEN 'TEACHER' THEN 0 ELSE 1 END, joined_at
               LIMIT 1""",
            (class_id,),
        )
        existing_teacher = cursor.fetchone()
        if existing_teacher:
            teacher_id = existing_teacher["user_id"]

        cursor.execute("SELECT start_date, max_members FROM class WHERE id=%s", (class_id,))
        class_row = cursor.fetchone()
        slots = DAY_SLOTS[index % len(DAY_SLOTS)]
        stats["schedules"] += _seed_schedules(cursor, class_id, slots, teacher_id)
        stats["members"] += _insert_member(cursor, class_id, teacher_id, "TEACHER", "ACTIVE", datetime.now() - timedelta(days=30))
        if ta_id is not None:
            stats["members"] += _insert_member(
                cursor, class_id, ta_id, "TA", "ACTIVE", datetime.now() - timedelta(days=25),
            )

        available_students = student_ids[(index * 7) % len(student_ids):] + student_ids[:(index * 7) % len(student_ids)]
        active_count = min(random.randint(4, 9), max(1, class_row["max_members"] - 1))
        for offset, student_id in enumerate(available_students[:active_count]):
            enrolled_at = datetime.now() - timedelta(days=active_count - offset + 2)
            enrollment, added = _get_or_create_enrollment(
                cursor, course["id"], class_id, student_id, 1, enrolled_at,
            )
            stats["enrollments"] += added
            stats["members"] += _insert_member(
                cursor, enrollment["class_id"], enrollment["user_id"], "STUDENT", "ACTIVE",
                enrolled_at,
            )
        for offset, student_id in enumerate(available_students[active_count:active_count + (index % 4)]):
            waitlisted_at = datetime.now() - timedelta(hours=(index % 4) - offset + 1)
            enrollment, added = _get_or_create_enrollment(
                cursor, course["id"], class_id, student_id, 0, waitlisted_at,
            )
            stats["enrollments"] += added
            stats["members"] += _insert_member(
                cursor, enrollment["class_id"], enrollment["user_id"],
                "STUDENT", "WAITLISTED", None, waitlisted_at,
            )
        cursor.execute(
            """UPDATE class SET current_member_count=(
                SELECT COUNT(*) FROM class_member
                WHERE class_id=%s AND role_in_class='STUDENT' AND status='ACTIVE'
            ) WHERE id=%s""",
            (class_id, class_id),
        )
        cursor.execute(
            """UPDATE course SET enrollment_count=(
                SELECT COUNT(*) FROM enrollment WHERE course_id=%s
            ) WHERE id=%s""",
            (course["id"], course["id"]),
        )
        stats["sessions"] += _seed_online_sessions(cursor, class_id, teacher_id, slots, class_row["start_date"], teacher_id)
        stats["packages"] += _insert_package(
            cursor, course, "Gói Lớp Nhóm Tương Tác", "GROUP_CLASS", price, 90, class_id,
        )

    print(
        "   [completed] "
        + " | ".join(f"{key}={value}" for key, value in stats.items())
    )


if __name__ == "__main__":
    from db import get_connection

    connection = get_connection()
    try:
        with connection.cursor() as db_cursor:
            seed(db_cursor)
        connection.commit()
        print("✅ Seed Course/Class Management thành công.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
