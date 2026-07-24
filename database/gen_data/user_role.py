"""
seed_user_roles.py
-------------------
Seed dữ liệu cho bảng `user_role`.
- CỐ ĐỊNH DATA 100%: Chạy lại không bị sinh thêm role, không bị đổi role.
- Không gán role ADMIN.
- Tỉ lệ role: 5% HR, 20% TEACHER, 30% TA, 45% STUDENT.
"""

import random
from datetime import datetime, timedelta
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ LUÔN PHÂN BỔ ROLE CỐ ĐỊNH KHÔNG ĐỔI ---
random.seed(42)
# --------------------------------------------------------


def get_all_users(cursor):
    """Lấy danh sách tất cả user từ bảng user."""
    cursor.execute("SELECT id, username FROM user")
    return cursor.fetchall()


def get_roles_map(cursor):
    """Lấy dictionary mapping code -> id của các role."""
    cursor.execute("SELECT id, code FROM role")
    rows = cursor.fetchall()
    return {row["code"]: row["id"] for row in rows}


def check_user_has_any_role(cursor, user_id: int):
    """
    LỚP BẢO VỆ: Chỉ cần user ĐÃ CÓ BẤT KỲ ROLE NÀO là bỏ qua ngay.
    Tránh trường hợp 1 user bị gán nhiều role khi chạy lại script.
    """
    cursor.execute(
        "SELECT id, role_id FROM user_role WHERE user_id = %s",
        (user_id,),
    )
    row = cursor.fetchone()
    return row if row else None


def seed(cursor):
    print("→ Seeding user_roles...")

    users = get_all_users(cursor)
    if not users:
        print("   [warning] Bảng `user` trống! Hãy chạy seed_users trước.")
        return

    roles_map = get_roles_map(cursor)

    required_roles = ["ADMIN", "HR", "TEACHER", "TA", "STUDENT"]
    for r_code in required_roles:
        if r_code not in roles_map:
            print(f"   [error] Không tìm thấy role {r_code} trong bảng role!")
            return

    # Lấy ID của role ADMIN làm assigned_by
    admin_id = roles_map["ADMIN"]

    # Sắp xếp user theo ID trước khi shuffle để đảm bảo kết quả shuffle
    # lần nào chạy cũng ra ĐÚNG 1 THỨ TỰ DUY NHẤT
    user_list = sorted(list(users), key=lambda x: x["id"])
    random.shuffle(user_list)
    total_users = len(user_list)

    # Tính toán số lượng theo tỉ lệ
    hr_count = int(total_users * 0.05)
    teacher_count = int(total_users * 0.20)
    ta_count = int(total_users * 0.30)
    student_count = total_users - (hr_count + teacher_count + ta_count)

    role_distribution = (
        [roles_map["HR"]] * hr_count
        + [roles_map["TEACHER"]] * teacher_count
        + [roles_map["TA"]] * ta_count
        + [roles_map["STUDENT"]] * student_count
    )

    for idx, u in enumerate(user_list):
        user_id = u["id"]
        username = u["username"]
        target_role_id = role_distribution[idx]

        # Check: Nếu user đã được gán role (bất kể role gì) thì skip luôn
        existing_role = check_user_has_any_role(cursor, user_id)
        if existing_role:
            print(f"   [skip] User {username:<25} đã có role rồi (id={existing_role['id']})")
            continue

        # Random thời gian gán trong vòng 30 ngày qua
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        assigned_at = datetime.now() - timedelta(
            days=days_ago, hours=hours_ago, minutes=minutes_ago
        )

        new_id = snowflake.next_id()

        cursor.execute(
            """
            INSERT INTO user_role (
                id, user_id, role_id, assigned_by, assigned_at, 
                expired_at, scope_type, scope_id, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, NULL, NULL, NULL, NOW(), NOW())
            """,
            (new_id, user_id, target_role_id, admin_id, assigned_at),
        )

        role_name = [code for code, r_id in roles_map.items() if r_id == target_role_id][0]
        print(f"   [insert] Gán role {role_name:<7} cho user {username:<25} (id={new_id})")