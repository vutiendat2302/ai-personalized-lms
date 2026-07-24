"""
seed_teacher_availabilities.py
-------------------------------
Seed dữ liệu cho bảng `teacher_availability` (Lịch rảnh của Giảng viên/Trợ giảng).
- TA (Part-time): Rất nhiều lịch rảnh (4 - 8 buổi/tuần, đa dạng sáng/chiều/tối/cuối tuần).
- TEACHER (Full-time): Chỉ ~40% đăng ký lịch rảnh (1 - 3 buổi/tuần, chủ yếu tối & cuối tuần).
- day_of_week: 1 (Thứ 2) -> 7 (Chủ Nhật).
- Khung giờ bám sát thực tế các ca học LMS.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime, time
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

# Các khung giờ chuẩn thực tế (startTime, endTime)
SLOTS_DAYTIME = [
    (time(8, 0), time(10, 0)),
    (time(8, 30), time(11, 30)),
    (time(9, 0), time(11, 0)),
    (time(13, 30), time(15, 30)),
    (time(14, 0), time(16, 0)),
    (time(14, 0), time(17, 0)),
]

SLOTS_EVENING = [
    (time(18, 0), time(20, 0)),
    (time(18, 30), time(20, 30)),
    (time(19, 0), time(21, 0)),
    (time(19, 30), time(21, 30)),
]

SLOTS_ALL = SLOTS_DAYTIME + SLOTS_EVENING

# Tỉ lệ status (BaseStatusEnum): 85% ACTIVE, 15% INACTIVE
STATUS_POOL = ["ACTIVE"] * 85 + ["INACTIVE"] * 15


def get_admin_id(cursor):
    """Lấy ID của Admin để gán vào created_by."""
    query = """
        SELECT u.id 
        FROM user u
        JOIN user_role ur ON u.id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code = 'ADMIN'
        LIMIT 1
    """
    cursor.execute(query)
    row = cursor.fetchone()
    return row["id"] if row else None


def get_employees_by_role(cursor, role_code: str):
    """Lấy danh sách user_id từ bảng employee theo role cụ thể (TEACHER hoặc TA)."""
    query = """
        SELECT DISTINCT e.user_id as id 
        FROM employee e
        JOIN user_role ur ON e.user_id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code = %s
    """
    try:
        cursor.execute(query, (role_code,))
        return sorted([row["id"] for row in cursor.fetchall()])
    except Exception:
        return []


def check_availability_exists(cursor, employee_id: int, day_of_week: int, start_time: time):
    """Kiểm tra xem giảng viên đã đăng ký khung giờ rảnh này chưa (Idempotent)."""
    query = """
        SELECT id FROM teacher_availability 
        WHERE employee_id = %s AND day_of_week = %s AND start_time = %s 
        LIMIT 1
    """
    cursor.execute(query, (employee_id, day_of_week, start_time))
    row = cursor.fetchone()
    return row["id"] if row else None


def insert_availability(cursor, emp_id: int, day: int, slot: tuple, status: str, admin_id: int):
    """Hàm phụ trợ để insert 1 record lịch rảnh."""
    start_time, end_time = slot

    if check_availability_exists(cursor, emp_id, day, start_time):
        return False

    now = datetime.now()
    new_id = snowflake.next_id()

    cursor.execute(
        """
        INSERT INTO teacher_availability (
            id, employee_id, day_of_week, start_time, end_time, status, 
            created_by, updated_by, created_at, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            new_id,
            emp_id,
            day,
            start_time,
            end_time,
            status,
            admin_id if admin_id else emp_id,  # created_by
            None,                              # updated_by
            now,                               # created_at
            now,                               # updated_at
        ),
    )
    return True


def seed(cursor):
    print("→ Seeding teacher_availability (Lịch rảnh của Giảng viên & Trợ giảng)...")

    admin_id = get_admin_id(cursor)

    # 1. Lấy danh sách TA và TEACHER
    ta_list = get_employees_by_role(cursor, "TA")
    teacher_list = get_employees_by_role(cursor, "TEACHER")

    if not ta_list and not teacher_list:
        print("   [warning] Không tìm thấy nhân sự có role TA hoặc TEACHER trong bảng employee!")
        return

    print(f"   [info] Tìm thấy {len(ta_list)} Trợ giảng (TA) và {len(teacher_list)} Giảng viên (TEACHER).")

    total_inserted = 0
    total_skipped = 0

    # =========================================================================
    # 2. XỬ LÝ TRỢ GIẢNG (TA) -> Rảnh nhiều (4 - 8 buổi/tuần, các thứ & các ca)
    # =========================================================================
    for ta_id in ta_list:
        num_slots = random.randint(4, 8)
        
        # Bốc ngẫu nhiên các thứ trong tuần (1 -> 7)
        available_days = random.choices(range(1, 8), k=num_slots)
        
        for day in available_days:
            slot = random.choice(SLOTS_ALL)
            status = random.choice(STATUS_POOL)
            
            if insert_availability(cursor, ta_id, day, slot, status, admin_id):
                total_inserted += 1
                print(f"   [insert] TA:      {ta_id:<18} | Thứ {day} | {slot[0].strftime('%H:%M')} - {slot[1].strftime('%H:%M')} | {status}")
            else:
                total_skipped += 1

    # =========================================================================
    # 3. XỬ LÝ GIẢNG VIÊN (TEACHER) -> Chỉ ~40% cày thêm (1 - 3 buổi tối/cuối tuần)
    # =========================================================================
    for teacher_id in teacher_list:
        # Chỉ 40% giảng viên có nhu cầu dạy thêm
        if random.random() > 0.40:
            continue
            
        num_slots = random.randint(1, 3)
        
        for _ in range(num_slots):
            # Giảng viên full-time chủ yếu rảnh tối trong tuần (1->5) hoặc ngày cuối tuần (6, 7)
            is_weekend = random.random() < 0.4
            
            if is_weekend:
                day = random.choice([6, 7])          # Thứ 7 hoặc CN
                slot = random.choice(SLOTS_ALL)      # Cuối tuần rảnh cả ban ngày lẫn tối
            else:
                day = random.randint(1, 5)           # Thứ 2 đến Thứ 6
                slot = random.choice(SLOTS_EVENING)  # Ngày thường chỉ rảnh ban tối

            status = random.choice(STATUS_POOL)

            if insert_availability(cursor, teacher_id, day, slot, status, admin_id):
                total_inserted += 1
                print(f"   [insert] TEACHER: {teacher_id:<18} | Thứ {day} | {slot[0].strftime('%H:%M')} - {slot[1].strftime('%H:%M')} | {status}")
            else:
                total_skipped += 1

    print(f"   [completed] Đã seed xong teacher_availability! Inserted: {total_inserted} | Skipped: {total_skipped}.")