"""
sales_order.py
---------------
Seed dữ liệu thực tế cho chuỗi quy trình bán hàng:
- Bảng `order` (Đơn hàng)
- Bảng `order_item` (Mục đơn hàng)
- Bảng `payment_transaction` (Giao dịch thanh toán cổng VNPAY/MOMO/Chuyển khoản)
- Bảng `enrollment` & `enrollment_package` (Ghi danh & mốc kích hoạt)
- Bảng `cart_item` (Giỏ hàng đang treo)
"""

import random
from datetime import datetime, timedelta
from snowflake_id import snowflake

random.seed(2026)

PAYMENT_METHODS = ["VNPAY", "MOMO", "BANK_TRANSFER"]
STATUS_POOL = ["PAID"] * 65 + ["PENDING"] * 20 + ["CANCELLED"] * 10 + ["REFUNDED"] * 5


def seed(cursor):
    print("→ Seeding sales_order & related payment/enrollment/cart tables...")

    # Lấy học viên từ DB
    cursor.execute("SELECT id, full_name, email FROM user LIMIT 50")
    users = cursor.fetchall()

    # Lấy các gói học từ DB
    cursor.execute("SELECT id, course_id, name, price, original_price FROM course_package LIMIT 50")
    packages = cursor.fetchall()

    if not users or not packages:
        print("   [warning] Thiếu dữ liệu user hoặc course_package, bỏ qua seed sales_order")
        return

    order_count = 0
    tx_count = 0
    enrollment_count = 0
    cart_count = 0

    # Seed 30 đơn hàng thực tế
    for i in range(35):
        user = random.choice(users)
        user_id = user["id"]
        status = random.choice(STATUS_POOL)
        order_id = snowflake.next_id()

        pkg = random.choice(packages)
        pkg_price = pkg["price"] if pkg["price"] else 3500000
        original_price = pkg["original_price"] if pkg["original_price"] else int(pkg_price * 1.2)

        discount_amount = random.choice([0, 0, 500000, 200000, 1000000])
        if discount_amount > pkg_price:
            discount_amount = 0

        final_amount = pkg_price - discount_amount
        coupon_code = "SUMMER2026" if discount_amount > 0 else None

        created_days_ago = random.randint(1, 45)
        created_at = datetime.now() - timedelta(days=created_days_ago, hours=random.randint(1, 12))
        expired_at = created_at + timedelta(hours=24)
        paid_at = created_at + timedelta(minutes=random.randint(5, 60)) if status in ["PAID", "REFUNDED"] else None

        # 1. Insert order
        cursor.execute(
            """
            INSERT INTO `order` (
                id, user_id, status, total_amount, discount_amount, final_amount,
                coupon_code, expired_at, paid_at, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_id,
                user_id,
                status,
                pkg_price,
                discount_amount,
                final_amount,
                coupon_code,
                expired_at,
                paid_at,
                created_at,
                created_at,
            ),
        )
        order_count += 1

        # 2. Insert order_item
        item_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO order_item (
                id, order_id, course_package_id, price_snapshot, item_type,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                item_id,
                order_id,
                pkg["id"],
                pkg_price,
                "NEW_PURCHASE",
                created_at,
                created_at,
            ),
        )

        # 3. Insert payment_transaction (nếu đơn không ở trạng thái CANCELLED hoàn toàn)
        if status in ["PAID", "REFUNDED", "PENDING"]:
            tx_id = snowflake.next_id()
            method = random.choice(PAYMENT_METHODS)
            tx_status = "SUCCESS" if status in ["PAID", "REFUNDED"] else "PENDING"
            tx_ref = f"{method}-{random.randint(100000, 999999)}"

            cursor.execute(
                """
                INSERT INTO payment_transaction (
                    id, order_id, payment_method, amount, status,
                    transaction_ref, paid_at, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    tx_id,
                    order_id,
                    method,
                    final_amount,
                    tx_status,
                    tx_ref,
                    paid_at,
                    created_at,
                    created_at,
                ),
            )
            tx_count += 1

        # 4. Insert enrollment & enrollment_package nếu đơn đã PAID
        if status == "PAID":
            # Kiểm tra xem user & course này đã ghi danh chưa
            cursor.execute(
                "SELECT id FROM enrollment WHERE user_id = %s AND course_id = %s",
                (user_id, pkg["course_id"]),
            )
            row = cursor.fetchone()
            if row:
                enrollment_id = row["id"]
            else:
                enrollment_id = snowflake.next_id()
                cursor.execute(
                    """
                    INSERT INTO enrollment (
                        id, user_id, course_id, status, enrolled_at, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        enrollment_id,
                        user_id,
                        pkg["course_id"],
                        0,  # IN_PROGRESS theo mapping của EnrollmentEntity
                        paid_at,
                        paid_at,
                        paid_at,
                    ),
                )
                enrollment_count += 1

            # Insert enrollment_package
            ep_id = snowflake.next_id()
            act_at = paid_at
            exp_at = act_at + timedelta(days=180)

            cursor.execute(
                """
                INSERT INTO enrollment_package (
                    id, enrollment_id, course_package_id, order_item_id,
                    activated_at, expires_at, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    ep_id,
                    enrollment_id,
                    pkg["id"],
                    item_id,
                    act_at,
                    exp_at,
                    act_at,
                    act_at,
                ),
            )

            # Cập nhật related_enrollment_id vào order_item
            cursor.execute(
                "UPDATE order_item SET related_enrollment_id = %s WHERE id = %s",
                (enrollment_id, item_id),
            )

    # 5. Seed cart_item (giỏ hàng đang treo)
    for u in random.sample(users, k=min(8, len(users))):
        p = random.choice(packages)
        # Unique constraint: uk_cart_user_package
        cursor.execute(
            "SELECT COUNT(*) as cnt FROM cart_item WHERE user_id = %s AND course_package_id = %s",
            (u["id"], p["id"]),
        )
        if cursor.fetchone()["cnt"] == 0:
            cart_id = snowflake.next_id()
            cart_created = datetime.now() - timedelta(hours=random.randint(2, 48))
            cursor.execute(
                """
                INSERT INTO cart_item (id, user_id, course_package_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (cart_id, u["id"], p["id"], cart_created, cart_created),
            )
            cart_count += 1

    print(f"   [insert] Đã tạo thành công {order_count} đơn hàng (`order`), {tx_count} giao dịch (`payment_transaction`), {enrollment_count} lượt ghi danh (`enrollment`), và {cart_count} giỏ hàng treo (`cart_item`)")
