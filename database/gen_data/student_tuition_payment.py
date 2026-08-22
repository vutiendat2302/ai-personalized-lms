"""Sinh dữ liệu học phí/thanh toán cho tab chi tiết học viên.

Mỗi học viên chưa có đơn hàng sẽ được tạo một order, order_item và
payment_transaction liên kết tới course_package thật. Script idempotent:
không tạo thêm dữ liệu nếu học viên đã có order.
"""

import random
from datetime import datetime, timedelta

from snowflake_id import snowflake


random.seed(260803)
ORDER_STATUSES = ["PAID", "PAID", "PAID", "PENDING", "CANCELLED"]
PAYMENT_METHODS = ["VNPAY", "MOMO", "BANK_TRANSFER"]


def seed(cursor):
    print("→ Seeding student tuition & payment data...")
    cursor.execute("SELECT user_id FROM student_profile ORDER BY user_id")
    student_ids = [row["user_id"] for row in cursor.fetchall()]
    cursor.execute("SELECT id, course_id, price, original_price FROM course_package ORDER BY id")
    packages = cursor.fetchall()

    if not student_ids or not packages:
        print("   [warning] Thiếu student_profile hoặc course_package, bỏ qua tuition/payment.")
        return

    inserted = 0
    skipped = 0
    for index, user_id in enumerate(student_ids):
        cursor.execute("SELECT id FROM `order` WHERE user_id = %s LIMIT 1", (user_id,))
        if cursor.fetchone():
            skipped += 1
            continue

        package = packages[index % len(packages)]
        status = ORDER_STATUSES[index % len(ORDER_STATUSES)]
        price = package["price"] or package["original_price"] or 500000
        discount = random.choice([0, 0, 50000, 100000])
        discount = min(discount, price)
        final_amount = price - discount
        created_at = datetime.now() - timedelta(days=random.randint(1, 60), hours=random.randint(0, 20))
        paid_at = created_at + timedelta(minutes=random.randint(3, 90)) if status == "PAID" else None
        order_id = snowflake.next_id()

        cursor.execute(
            """
            INSERT INTO `order` (
                id, user_id, status, total_amount, discount_amount, final_amount,
                coupon_code, expired_at, paid_at, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (order_id, user_id, status, price, discount, final_amount, None,
             created_at + timedelta(hours=24), paid_at, created_at, paid_at or created_at),
        )

        cursor.execute(
            """
            INSERT INTO order_item (
                id, order_id, course_package_id, price_snapshot, discount_snapshot, final_price, item_type,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, 'NEW_PURCHASE', %s, %s)
            """,
            (snowflake.next_id(), order_id, package["id"], price, discount, final_amount, created_at, created_at),
        )

        transaction_status = "SUCCESS" if status == "PAID" else ("FAILED" if status == "CANCELLED" else "PENDING")
        method = PAYMENT_METHODS[index % len(PAYMENT_METHODS)]
        cursor.execute(
            """
            INSERT INTO payment_transaction (
                id, order_id, payment_method, amount, status, transaction_ref,
                paid_at, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (snowflake.next_id(), order_id, method, final_amount, transaction_status,
             f"SEED-{method}-{order_id}", paid_at, created_at, paid_at or created_at),
        )
        inserted += 1

    print(f"   [completed] tuition/payment — Inserted: {inserted} | Skipped: {skipped}.")
