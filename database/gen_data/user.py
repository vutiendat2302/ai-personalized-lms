# pip install faker
"""
seed_users.py
--------------
Seed dữ liệu cho bảng `user` (~150 users).
Mật khẩu chung cho tất cả user là: Password@123
"""

import random
from datetime import datetime, timedelta
from faker import Faker
from snowflake_id import snowflake


Faker.seed(42)      
random.seed(42)      
# Sử dụng locale vi_VN để tạo họ tên, số điện thoại chuẩn Việt Nam
fake = Faker("vi_VN")

# Chuỗi hash BCrypt chuẩn của mật khẩu: Password@123 (với cost/strength = 10)
# Spring Security BCryptPasswordEncoder sẽ verify thành công với chuỗi này.
COMMON_PASSWORD_HASH = "$2a$10$xazISHupvR3eaffzWOK6ueom3n.y731CmmYQqzfxq36XdDInm7iva"

TOTAL_USERS = 150

# Phân bổ trạng thái theo yêu cầu:
# 80% ACTIVE = 120
# 20% còn lại (30 user) chia tỉ lệ 4:3:2:1 -> INACTIVE(12), DELETED(9), LOCKED(6), PENDING_VERIFICATION(3)
STATUS_POOL = (
    ["ACTIVE"] * 120
    + ["INACTIVE"] * 12
    + ["DELETED"] * 9
    + ["LOCKED"] * 6
    + ["PENDING_VERIFICATION"] * 3
)


def generate_users_data():
    """Sinh danh sách 150 user với dữ liệu thực tế."""
    users = []
    # Xáo trộn mảng status để phân bố ngẫu nhiên
    status_list = list(STATUS_POOL)
    random.shuffle(status_list)

    for i in range(TOTAL_USERS):
        gender = random.choice([0, 1, 2])  # 0: Nam, 1: Nữ, 2: Khác

        # Tạo họ tên phù hợp với giới tính
        if gender == 0:
            full_name = fake.name_male()
        elif gender == 1:
            full_name = fake.name_female()
        else:
            full_name = fake.name()

        # Xử lý username & email duy nhất, không dấu, viết liền
        name_parts = fake.slug(full_name).replace("-", "")
        username = f"{name_parts}_{i+1}"
        email = f"{username}@gmail.com"

        # Số điện thoại chuẩn Việt Nam
        phone = fake.phone_number()

        # AvatarUrl: 70% có ảnh, 30% null
        avatar_url = (
            f"https://i.pravatar.cc/150?u={username}" if random.random() < 0.7 else None
        )

        # Ngày sinh: từ 18 đến 45 tuổi
        dob = fake.date_of_birth(minimum_age=18, maximum_age=45)
        date_of_birth = datetime.combine(dob, datetime.min.time())

        status = status_list[i]

        # lastLoginAt: Chỉ hợp lý khi tài khoản đã từng hoạt động (ACTIVE, LOCKED, DELETED)
        # Random trong vòng 30 ngày trở lại đây
        last_login_at = None
        if status in ["ACTIVE", "LOCKED", "DELETED"] and random.random() < 0.8:
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            last_login_at = datetime.now() - timedelta(
                days=days_ago, hours=hours_ago, minutes=minutes_ago
            )

        # JSON attributes đơn giản
        attributes = '{"theme": "light", "notifications_enabled": true}'

        users.append(
            {
                "username": username,
                "email": email,
                "password_hash": COMMON_PASSWORD_HASH,
                "full_name": full_name,
                "phone": phone,
                "avatar_url": avatar_url,
                "gender": gender,
                "date_of_birth": date_of_birth,
                "attributes": attributes,
                "status": status,
                "last_login_at": last_login_at,
            }
        )

    return users


def get_id_by_username_or_email(cursor, username: str, email: str):
    """Kiểm tra user đã tồn tại qua username hoặc email chưa."""
    cursor.execute(
        "SELECT id FROM user WHERE username = %s OR email = %s", (username, email)
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Insert dữ liệu user nếu chưa tồn tại (idempotent theo `username` hoặc `email`)."""
    print("→ Seeding users...")
    users_data = generate_users_data()

    for u in users_data:
        existing_id = get_id_by_username_or_email(cursor, u["username"], u["email"])
        if existing_id:
            print(
                f"   [skip] user {u['username']} ({u['email']}) đã tồn tại (id={existing_id})"
            )
            continue

        new_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO user (
                id, username, email, password_hash, full_name, 
                phone, avatar_url, gender, date_of_birth, attributes, 
                status, last_login_at, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (
                new_id,
                u["username"],
                u["email"],
                u["password_hash"],
                u["full_name"],
                u["phone"],
                u["avatar_url"],
                u["gender"],
                u["date_of_birth"],
                u["attributes"],
                u["status"],
                u["last_login_at"],
            ),
        )
        print(
            f"   [insert] user {u['username']} | status: {u['status']} (id={new_id})"
        )