"""
seed_users.py
--------------
Seed dữ liệu cho bảng `user` (~150 users).
- Đã cập nhật thêm cột avatar_url (70% có ảnh, 30% NULL).
- Dời seed vào trong hàm để đảm bảo 100% độc lập, không bị lệch random.
- Thêm CHỐT CHẶN TỔNG: Nếu bảng đã đủ user -> Skip luôn.
Mật khẩu chung cho tất cả user là: Password@123
"""

import random
from datetime import datetime, timedelta
from faker import Faker
from snowflake_id import snowflake

fake = Faker("vi_VN")

# Chuỗi hash BCrypt chuẩn của mật khẩu: Password@123 (với cost/strength = 10)
COMMON_PASSWORD_HASH = "$2a$10$djMqqqaw5rFMJgibP/iCU.D1tdCyXRDpqjNtI61ifaARAS0X9Sgl6"

TOTAL_USERS = 150

STATUS_POOL = (
    ["ACTIVE"] * 120
    + ["INACTIVE"] * 12
    + ["DELETED"] * 9
    + ["LOCKED"] * 6
    + ["PENDING_VERIFICATION"] * 3
)

def check_has_enough_users(cursor):
    """
    ---> CHỐT CHẶN TỔNG <---
    Nếu bảng user đã có đủ (hoặc hơn) số lượng user yêu cầu thì bỏ qua.
    """
    cursor.execute("SELECT COUNT(id) as total FROM user")
    row = cursor.fetchone()
    return (row["total"] if row else 0) >= TOTAL_USERS

def generate_users_data():
    """Sinh danh sách 150 user với dữ liệu thực tế."""
    # ---> KHÓA RANDOM NGAY TẠI ĐÂY <---
    Faker.seed(42)      
    random.seed(42)      
    
    users = []
    status_list = list(STATUS_POOL)
    random.shuffle(status_list)

    for i in range(TOTAL_USERS):
        gender = random.choice([0, 1, 2])

        if gender == 0:
            full_name = fake.name_male()
        elif gender == 1:
            full_name = fake.name_female()
        else:
            full_name = fake.name()

        name_parts = fake.slug(full_name).replace("-", "")
        username = f"{name_parts}_{i+1}"
        email = f"{username}@gmail.com"

        phone = fake.phone_number()

        # AvatarUrl: 70% có ảnh, 30% null
        avatar_url = (
            f"https://i.pravatar.cc/150?u={username}" if random.random() < 0.7 else None
        )

        dob = fake.date_of_birth(minimum_age=18, maximum_age=45)
        date_of_birth = datetime.combine(dob, datetime.min.time())

        status = status_list[i]

        last_login_at = None
        if status in ["ACTIVE", "LOCKED", "DELETED"] and random.random() < 0.8:
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            last_login_at = datetime.now() - timedelta(
                days=days_ago, hours=hours_ago, minutes=minutes_ago
            )

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
        "SELECT id FROM user WHERE username = %s OR email = %s LIMIT 1", (username, email)
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    print("→ Seeding users...")
    
    # Kích hoạt chốt chặn tổng
    if check_has_enough_users(cursor):
        print(f"   [skip] Bảng `user` đã có >= {TOTAL_USERS} bản ghi. Bỏ qua để chống lặp.")
        return
        
    users_data = generate_users_data()
    total_inserted = 0
    total_skipped = 0

    for u in users_data:
        existing_id = get_id_by_username_or_email(cursor, u["username"], u["email"])
        if existing_id:
            total_skipped += 1
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
        total_inserted += 1
        
        # Log ra đẹp mắt để kiểm tra xem avatar có vào không
        avatar_status = "Có ảnh" if u["avatar_url"] else "NULL"
        print(f"   [insert] user {u['username']:<22} | Avatar: {avatar_status:<6} | status: {u['status']}")

    print(f"   [completed] Đã seed xong user! Inserted: {total_inserted} | Skipped: {total_skipped}.")