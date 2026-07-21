"""
seed_coupon.py
----------------
Seed dữ liệu cho bảng `coupon` (mã giảm giá do Admin phát hành).

discount_type: PERCENT | FIXED  (CouponDiscountTypeEnum)
status:        ACTIVE  | INACTIVE (CouponStatusEnum)

Nếu trong DB đã có dữ liệu ở bảng `course`, một số coupon sẽ được gán
ngẫu nhiên vào `applicable_course_id` (mã áp dụng riêng cho 1 khóa học);
số còn lại để NULL nghĩa là áp dụng cho tất cả khóa học.
"""

import random
from datetime import datetime, timedelta

from snowflake_id import snowflake

random.seed(2026)  # cố định seed để dữ liệu sinh ra ổn định, dễ review

# (code, discount_type, discount_value, max_usage, used_count_ratio, valid_from, valid_to, status)
# used_count_ratio: tỉ lệ % so với max_usage để tính used_count giả lập thực tế (None nếu max_usage=None)
COUPONS = [
    ("WELCOME100K", "FIXED", 100000, 500, 0.62,
     "2025-09-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("NEWUSER10", "PERCENT", 10, None, None,
     "2025-01-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("SUMMER2026", "PERCENT", 20, 300, 0.45,
     "2026-06-01 00:00:00", "2026-08-31 23:59:59", "ACTIVE"),
    ("TET2026", "FIXED", 150000, 200, 1.0,
     "2026-01-15 00:00:00", "2026-02-15 23:59:59", "INACTIVE"),
    ("KHAIGIANG2026", "PERCENT", 15, 400, 0.30,
     "2026-08-15 00:00:00", "2026-09-15 23:59:59", "ACTIVE"),
    ("BACK2SCHOOL", "FIXED", 80000, 1000, 0.18,
     "2026-08-01 00:00:00", "2026-09-30 23:59:59", "ACTIVE"),
    ("STUDENT15", "PERCENT", 15, None, None,
     "2025-06-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("TEACHERDAY20", "PERCENT", 20, 150, 1.0,
     "2025-11-15 00:00:00", "2025-11-21 23:59:59", "INACTIVE"),
    ("WOMEN8_3", "FIXED", 83000, 200, 1.0,
     "2026-03-01 00:00:00", "2026-03-08 23:59:59", "INACTIVE"),
    ("CHILDREN1_6", "FIXED", 60000, 300, 0.55,
     "2026-05-25 00:00:00", "2026-06-06 23:59:59", "ACTIVE"),
    ("INDEPENDENCE2_9", "PERCENT", 29, 250, 0.40,
     "2026-08-25 00:00:00", "2026-09-05 23:59:59", "ACTIVE"),
    ("CHRISTMAS2025", "FIXED", 120000, 300, 1.0,
     "2025-12-15 00:00:00", "2025-12-26 23:59:59", "INACTIVE"),
    ("NEWYEAR2026", "PERCENT", 26, 500, 0.72,
     "2025-12-28 00:00:00", "2026-01-05 23:59:59", "INACTIVE"),
    ("VALENTINE14", "FIXED", 140000, 140, 1.0,
     "2026-02-07 00:00:00", "2026-02-14 23:59:59", "INACTIVE"),
    ("BLACKFRIDAY25", "PERCENT", 25, 1000, 0.83,
     "2025-11-28 00:00:00", "2025-11-30 23:59:59", "INACTIVE"),
    ("MEGA11_11", "PERCENT", 35, 500, 1.0,
     "2025-11-10 00:00:00", "2025-11-12 23:59:59", "INACTIVE"),
    ("SALE12_12", "PERCENT", 40, 500, 0.91,
     "2025-12-11 00:00:00", "2025-12-13 23:59:59", "ACTIVE"),
    ("FLASHSALE50K", "FIXED", 50000, 100, 1.0,
     "2026-04-01 00:00:00", "2026-04-02 23:59:59", "INACTIVE"),
    ("FLASH12H", "PERCENT", 30, 80, 0.95,
     "2026-07-20 06:00:00", "2026-07-20 18:00:00", "ACTIVE"),
    ("EARLYBIRD20", "PERCENT", 20, None, None,
     "2026-01-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("LOYALTY5", "PERCENT", 5, None, None,
     "2025-01-01 00:00:00", "2027-01-01 00:00:00", "ACTIVE"),
    ("REFER50K", "FIXED", 50000, None, None,
     "2025-06-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("COMBO3COURSE", "PERCENT", 18, 300, 0.27,
     "2026-03-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("VIP30", "PERCENT", 30, 50, 0.88,
     "2026-01-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("ANNIVERSARY5Y", "FIXED", 500000, 100, 1.0,
     "2025-10-10 00:00:00", "2025-10-20 23:59:59", "INACTIVE"),
    ("APP_DOWNLOAD50K", "FIXED", 50000, 2000, 0.34,
     "2025-05-01 00:00:00", "2026-12-31 23:59:59", "ACTIVE"),
    ("IELTS_PROMO", "PERCENT", 22, 200, 0.50,
     "2026-02-01 00:00:00", "2026-06-30 23:59:59", "ACTIVE"),
    ("IT_COURSE_SALE", "PERCENT", 25, 300, 0.60,
     "2026-01-15 00:00:00", "2026-03-15 23:59:59", "INACTIVE"),
]


def get_id_by_code(cursor, code: str):
    cursor.execute("SELECT id FROM coupon WHERE code = %s", (code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def get_random_course_ids(cursor, limit: int = 20):
    """Lấy danh sách course_id có sẵn trong DB (nếu bảng course đã có dữ liệu)."""
    try:
        cursor.execute("SELECT id FROM course LIMIT %s", (limit,))
        rows = cursor.fetchall()
        return [row["id"] for row in rows]
    except Exception:
        # Bảng course chưa tồn tại hoặc chưa có dữ liệu -> bỏ qua, coupon áp dụng toàn hệ thống
        return []


def parse_dt(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


def seed(cursor):
    """Insert dữ liệu coupon nếu chưa tồn tại (idempotent theo `code`)."""
    print("→ Seeding coupon...")

    course_ids = get_random_course_ids(cursor)
    # ~30% coupon sẽ được gán riêng cho 1 khóa học cụ thể (nếu có dữ liệu course)
    course_assign_ratio = 0.3

    for code, discount_type, discount_value, max_usage, used_ratio, valid_from, valid_to, status in COUPONS:
        existing_id = get_id_by_code(cursor, code)
        if existing_id:
            print(f"   [skip] coupon {code} đã tồn tại (id={existing_id})")
            continue

        used_count = 0
        if max_usage is not None and used_ratio is not None:
            used_count = int(max_usage * used_ratio)

        applicable_course_id = None
        if course_ids and random.random() < course_assign_ratio:
            applicable_course_id = random.choice(course_ids)

        new_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO coupon (
                id, code, discount_type, discount_value, applicable_course_id,
                max_usage, used_count, valid_from, valid_to, status,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (
                new_id, code, discount_type, discount_value, applicable_course_id,
                max_usage, used_count, parse_dt(valid_from), parse_dt(valid_to), status,
            ),
        )
        scope = f"course_id={applicable_course_id}" if applicable_course_id else "toàn hệ thống"
        print(f"   [insert] coupon {code} (id={new_id}, {discount_type} {discount_value}, {scope})")