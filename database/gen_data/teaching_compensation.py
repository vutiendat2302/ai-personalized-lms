"""Seed dữ liệu vận hành giảng dạy và thù lao.

Luồng dữ liệu được tạo theo đúng quan hệ của backend:
class_online -> teaching_rate -> teaching_session_payment.
Chỉ các buổi đã diễn ra mới có thanh toán; đơn giá và số tiền được snapshot
tại thời điểm buổi dạy để có thể kiểm thử đầy đủ các màn hình nghiệp vụ.
"""

from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import random
import uuid

from snowflake_id import snowflake


RNG = random.Random(20260801)
MONEY = Decimal("0.01")


def _exists(cursor, query, params):
    cursor.execute(query, params)
    return cursor.fetchone() is not None


def _class_online_code_exists(cursor, code):
    return _exists(cursor, "SELECT 1 FROM class_online WHERE code=%s LIMIT 1", (code,))


def _generate_class_online_code(cursor):
    yy_mm = datetime.now().strftime("%y%m")
    for _ in range(10):
        random_part = uuid.uuid4().hex[:6].upper()
        candidate = f"BH-{yy_mm}-{random_part}"
        if not _class_online_code_exists(cursor, candidate):
            return candidate
    raise RuntimeError("Tao ma code that bai BH sau 10 lan")


def _backfill_class_online_codes(cursor):
    cursor.execute("SELECT id FROM class_online WHERE code IS NULL OR TRIM(code) = ''")
    rows = cursor.fetchall()
    for row in rows:
        cursor.execute(
            "UPDATE class_online SET code=%s, updated_at=%s WHERE id=%s",
            (_generate_class_online_code(cursor), datetime.now(), row["id"]),
        )
    return len(rows)


def _rate_amount(rate, minutes):
    return (Decimal(rate) * Decimal(minutes) / Decimal(60)).quantize(
        MONEY, rounding=ROUND_HALF_UP
    )


def _seed_rate(cursor, employee_id, class_id, rate, effective_from,
               effective_to, status, description, actor_id):
    cursor.execute(
        """
        SELECT id, rate FROM teaching_rate
        WHERE employee_id=%s AND class_id=%s AND description=%s
        LIMIT 1
        """,
        (employee_id, class_id, description),
    )
    existing = cursor.fetchone()
    if existing:
        return existing["id"], Decimal(existing["rate"]), 0

    rate_id = snowflake.next_id()
    now = datetime.now()
    cursor.execute(
        """
        INSERT INTO teaching_rate (
            id, employee_id, class_id, rate, effective_from, effective_to,
            status, description, created_at, updated_at, created_by, updated_by
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            rate_id, employee_id, class_id, rate, effective_from, effective_to,
            status, description, now, now, actor_id, actor_id,
        ),
    )
    return rate_id, Decimal(rate), 1


def _ensure_online_sessions(cursor, class_row):
    """Bổ sung buổi online nếu class chưa được course_class seeder xử lý."""
    cursor.execute(
        "SELECT COUNT(*) AS total FROM class_online WHERE class_id=%s",
        (class_row["class_id"],),
    )
    if cursor.fetchone()["total"]:
        return 0

    cursor.execute(
        """
        SELECT day_of_week, start_time, end_time
        FROM class_schedule WHERE class_id=%s AND status='ACTIVE'
        ORDER BY day_of_week, start_time
        """,
        (class_row["class_id"],),
    )
    schedules = cursor.fetchall()
    if not schedules:
        return 0

    inserted = 0
    now = datetime.now()
    monday = now.date() - timedelta(days=now.isoweekday() - 1)
    topics = [
        "Khởi động và tổng quan", "Kiến thức nền tảng", "Thực hành có hướng dẫn",
        "Chữa bài và hỏi đáp", "Bài tập tình huống", "Ôn tập chuyên đề",
    ]
    for week in range(-4, 5):
        for slot_index, schedule in enumerate(schedules):
            session_date = monday + timedelta(
                weeks=week, days=int(schedule["day_of_week"]) - 1
            )
            scheduled_at = datetime.combine(session_date, schedule["start_time"])
            duration = int(
                (
                    datetime.combine(session_date, schedule["end_time"])
                    - scheduled_at
                ).total_seconds() / 60
            )
            cursor.execute(
                """
                INSERT INTO class_online (
                    id, code, class_id, teacher_id, title, meeting_url, meeting_provider, scheduled_at,
                    duration_min, status, created_at, updated_at, created_by, updated_by
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    snowflake.next_id(), _generate_class_online_code(cursor), class_row["class_id"], class_row["teacher_id"],
                    f"Buổi {inserted + 1}: {topics[(week + slot_index) % len(topics)]}",
                    f"https://meet.google.com/ailms-{class_row['class_id']}-{week + 5}-{slot_index + 1}",
                    "GOOGLE_MEET", scheduled_at, duration,
                    "INACTIVE" if scheduled_at < now else "ACTIVE",
                    now, now, class_row["teacher_id"], class_row["teacher_id"],
                ),
            )
            inserted += 1
    return inserted


def seed(cursor):
    print("→ Seeding Class Online / Teaching Rate / Teaching Payment...")

    # Một buổi có thể trả riêng cho giáo viên chính và từng trợ giảng.
    cursor.execute("""
        SELECT index_name FROM information_schema.statistics
        WHERE table_schema=DATABASE() AND table_name='teaching_session_payment'
          AND index_name='uk_session_payment_employee' LIMIT 1
    """)
    if not cursor.fetchone():
        cursor.execute("""ALTER TABLE teaching_session_payment
            ADD UNIQUE INDEX uk_session_payment_employee (class_online_id, employee_id)""")
    cursor.execute("""
        SELECT index_name FROM information_schema.statistics
        WHERE table_schema=DATABASE() AND table_name='teaching_session_payment'
          AND index_name='uk_class_online_id' LIMIT 1
    """)
    if cursor.fetchone():
        cursor.execute("ALTER TABLE teaching_session_payment DROP INDEX uk_class_online_id")

    cursor.execute(
        """
        SELECT c.id AS class_id, c.name AS class_name, cm.user_id AS teacher_id
        FROM class c
        JOIN class_member cm ON cm.class_id=c.id
          AND cm.role_in_class IN ('TEACHER','TA') AND cm.status='ACTIVE'
        JOIN employee e ON e.user_id=cm.user_id
        WHERE c.status='ACTIVE'
        ORDER BY c.id, CASE cm.role_in_class WHEN 'TEACHER' THEN 0 ELSE 1 END
        """
    )
    rows = cursor.fetchall()
    if not rows:
        print("   [warning] Không có lớp ACTIVE kèm giảng viên. Hãy chạy course_class.seed() trước.")
        return

    stats = {
        "online_sessions": 0,
        "online_codes_backfilled": _backfill_class_online_codes(cursor),
        "rates": 0,
        "payments": 0,
    }
    now = datetime.now()

    initialized_classes = set()
    for class_index, class_row in enumerate(rows):
        if class_row["class_id"] not in initialized_classes:
            stats["online_sessions"] += _ensure_online_sessions(cursor, class_row)
            initialized_classes.add(class_row["class_id"])
        cursor.execute(
            """
            SELECT id, scheduled_at, duration_min, teacher_id, title
            FROM class_online
            WHERE class_id=%s
            ORDER BY scheduled_at
            """,
            (class_row["class_id"],),
        )
        sessions = cursor.fetchall()
        if not sessions:
            continue

        first_at = sessions[0]["scheduled_at"]
        cutoff = datetime.combine((now - timedelta(days=14)).date(), datetime.min.time())
        base_rate = Decimal(220000 + (class_index % 6) * 30000)

        # Tạo lịch sử tăng đơn giá để kiểm thử lọc ACTIVE/INACTIVE và snapshot.
        old_rate_id, old_rate, added = _seed_rate(
            cursor, class_row["teacher_id"], class_row["class_id"], base_rate,
            first_at - timedelta(days=30), cutoff - timedelta(seconds=1), "INACTIVE",
            f"Đơn giá khởi điểm cho {class_row['class_name']}", class_row["teacher_id"],
        )
        stats["rates"] += added
        current_rate_id, current_rate, added = _seed_rate(
            cursor, class_row["teacher_id"], class_row["class_id"],
            base_rate + Decimal(30000), cutoff, None, "ACTIVE",
            f"Đơn giá hiện hành cho {class_row['class_name']}", class_row["teacher_id"],
        )
        stats["rates"] += added

        past_sessions = [s for s in sessions if s["scheduled_at"] < now]
        for session_index, session in enumerate(past_sessions):
            if _exists(
                cursor,
                "SELECT 1 FROM teaching_session_payment WHERE class_online_id=%s AND employee_id=%s LIMIT 1",
                (session["id"], class_row["teacher_id"]),
            ):
                continue

            rate_id, rate = (
                (old_rate_id, old_rate)
                if session["scheduled_at"] < cutoff
                else (current_rate_id, current_rate)
            )
            planned = int(session["duration_min"] or 90)
            actual = max(30, planned + RNG.choice([-10, -5, 0, 0, 5, 10]))
            age_days = (now - session["scheduled_at"]).days
            if age_days >= 21:
                payment_status = "PAID"
                note = "Đã đối soát và thanh toán trong kỳ lương trước"
            elif age_days >= 7:
                payment_status = "CONFIRMED"
                note = "Đã xác nhận chất lượng buổi dạy, chờ đưa vào kỳ lương"
            elif session_index % 3 == 0:
                payment_status = "PENDING"
                note = "Trợ giảng đã đánh giá, đang chờ quản lý xác nhận"
            else:
                payment_status = "DRAFT"
                note = "Tạo tự động sau khi buổi học kết thúc"

            cursor.execute(
                """
                INSERT INTO teaching_session_payment (
                    id, class_online_id, employee_id, rate_id, rate_applied,
                    actual_duration_min, amount, status, description,
                    created_at, updated_at, created_by, updated_by
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    snowflake.next_id(), session["id"], class_row["teacher_id"],
                    rate_id, rate, actual, _rate_amount(rate, actual), payment_status,
                    f"{note} | {session['title']}",
                    session["scheduled_at"] + timedelta(minutes=actual), now,
                    class_row["teacher_id"], class_row["teacher_id"],
                ),
            )
            stats["payments"] += 1

    print("   [completed] " + " | ".join(f"{key}={value}" for key, value in stats.items()))


if __name__ == "__main__":
    from db import get_connection

    connection = get_connection()
    try:
        with connection.cursor() as db_cursor:
            seed(db_cursor)
        connection.commit()
        print("✅ Seed dữ liệu giảng dạy và thù lao thành công.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
