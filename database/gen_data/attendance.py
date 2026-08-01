"""
seed_attendances.py
--------------------
Seed dữ liệu cho bảng `attendance` (Chấm công nhân viên).
- Chỉ lấy nhân viên có role: TEACHER, HR (Làm việc FULL_TIME).
- Sinh dữ liệu trong 5 tháng (01/03/2026 -> 31/07/2026).
- Chỉ chấm công ngày làm việc (Thứ 2 đến Thứ 6).
- Tỉ lệ: 90% PRESENT, 5% LATE, 2% ABSENT, 2% ON_LEAVE, 1% HALF_DAY.
- Cố định seed 100% (random.seed(42)).
- Tự động tính toán work_date, work_shift_id, worked_minutes, late_minutes, early_leave_minutes, overtime_minutes, source, approved_by, approved_at.
"""

import random
from datetime import datetime, timedelta, date, time
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------


def get_admin_id(cursor):
    """Lấy ID của Admin để gán vào created_by và approved_by."""
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


def get_default_shift_id(cursor):
    """Lấy ID ca làm việc mặc định (nếu có bảng work_shift)."""
    try:
        cursor.execute("SELECT id FROM work_shift LIMIT 1")
        row = cursor.fetchone()
        return row["id"] if row else None
    except Exception:
        return None


def get_target_employees(cursor):
    """
    Lấy danh sách user_id từ bảng employee có role là TEACHER hoặc HR.
    """
    query = """
        SELECT DISTINCT e.user_id as id, r.code as role_code
        FROM employee e
        JOIN user_role ur ON e.user_id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code IN ('TEACHER', 'HR')
    """
    cursor.execute(query)
    # Sắp xếp để cố định thứ tự khi random
    return sorted([row["id"] for row in cursor.fetchall()])


def check_attendance_exists(cursor, employee_id: int, target_date: date):
    """Kiểm tra nhân viên đã được chấm công trong ngày đó chưa (Idempotent theo ngày)."""
    start_of_day = datetime.combine(target_date, time.min)
    end_of_day = datetime.combine(target_date, time.max)
    
    query = """
        SELECT id FROM attendance 
        WHERE employee_id = %s AND (work_date = %s OR created_at BETWEEN %s AND %s)
        LIMIT 1
    """
    try:
        cursor.execute(query, (employee_id, target_date, start_of_day, end_of_day))
    except Exception:
        query_fallback = """
            SELECT id FROM attendance 
            WHERE employee_id = %s AND created_at BETWEEN %s AND %s
            LIMIT 1
        """
        cursor.execute(query_fallback, (employee_id, start_of_day, end_of_day))
    row = cursor.fetchone()
    return row["id"] if row else None


def check_employee_has_attendance(cursor, employee_id: int):
    """
    ---> CHỐT CHẶN TỔNG Siêu Mạnh <---
    Kiểm tra xem nhân viên này ĐÃ CÓ bất kỳ bản ghi chấm công nào chưa.
    Nếu có rồi -> Đã được seed từ lần chạy trước -> Bỏ qua luôn cả 5 tháng!
    """
    query = "SELECT 1 FROM attendance WHERE employee_id = %s LIMIT 1"
    try:
        cursor.execute(query, (employee_id,))
    except Exception:
        # Fallback phòng hờ tên bảng trong DB của m là số nhiều (attendances)
        cursor.execute("SELECT 1 FROM attendances WHERE employee_id = %s LIMIT 1", (employee_id,))
    return cursor.fetchone() is not None


def seed(cursor):
    print("→ Seeding attendances (5 tháng cho TEACHER & HR)...")

    # 1. Lấy ID Admin & Shift ID
    admin_id = get_admin_id(cursor)
    if not admin_id:
        print("   [warning] Không tìm thấy user ADMIN! Tạm để NULL cho created_by / approved_by.")
        admin_id = None

    shift_id = get_default_shift_id(cursor)

    # 2. Lấy danh sách nhân viên hợp lệ (TEACHER, HR)
    employees = get_target_employees(cursor)
    if not employees:
        print("   [warning] Không tìm thấy nhân viên nào có role TEACHER hoặc HR trong bảng employee!")
        return

    print(f"   [info] Tìm thấy {len(employees)} nhân viên (TEACHER/HR) để tạo dữ liệu chấm công.")

    # 3. Định nghĩa khoảng thời gian 5 tháng (Từ 01/03/2026 đến 31/07/2026)
    start_date = date(2026, 3, 1)
    end_date = date(2026, 7, 31)
    
    total_days = (end_date - start_date).days + 1
    
    # Tạo danh sách các ngày làm việc (Thứ 2 đến Thứ 6)
    work_days = []
    for i in range(total_days):
        current_date = start_date + timedelta(days=i)
        if current_date.weekday() < 5:  # 0->4 là T2->T6; 5,6 là T7,CN
            work_days.append(current_date)

    # 4. Mảng tỉ lệ Status (100 phần tử):
    # 90% PRESENT, 5% LATE, 2% ABSENT, 2% ON_LEAVE, 1% HALF_DAY
    status_pool = (
        ["PRESENT"] * 90
        + ["LATE"] * 5
        + ["ABSENT"] * 2
        + ["ON_LEAVE"] * 2
        + ["HALF_DAY"] * 1
    )

    total_inserted = 0
    total_skipped = 0

    # 5. Lặp qua từng nhân viên và từng ngày làm việc
    for emp_id in employees:
        
        # ---> KIỂM TRA CHỐT CHẶN TỔNG <---
        # Nếu nhân viên này đã có chấm công -> Bỏ qua ngay lập tức, không lặp ngày!
        if check_employee_has_attendance(cursor, emp_id):
            total_skipped += len(work_days)
            continue
        
        for w_date in work_days:
            # Check idempotent
            if check_attendance_exists(cursor, emp_id, w_date):
                total_skipped += 1
                continue

            # Random status theo tỉ lệ đã định nghĩa
            status = random.choice(status_pool)
            
            check_in_time = None
            check_out_time = None
            note = None

            # Xử lý logic giờ làm việc và ghi chú theo status
            if status == "PRESENT":
                check_in_time = datetime.combine(w_date, time(7, random.randint(45, 59)))
                check_out_time = datetime.combine(w_date, time(17, random.randint(0, 30)))
            
            elif status == "LATE":
                hour = random.choice([8, 9])
                minute = random.randint(5, 59) if hour == 8 else random.randint(0, 30)
                check_in_time = datetime.combine(w_date, time(hour, minute))
                check_out_time = datetime.combine(w_date, time(17, random.randint(0, 30)))
                note = random.choice([
                    "Đi làm muộn do tắc đường", 
                    "Xe hỏng giữa đường", 
                    "Ngập lụt do mưa lớn", 
                    "Có việc gia đình đột xuất buổi sáng"
                ])
            
            elif status == "HALF_DAY":
                if random.random() < 0.5:
                    check_in_time = datetime.combine(w_date, time(7, random.randint(45, 55)))
                    check_out_time = datetime.combine(w_date, time(12, 0))
                    note = "Xin nghỉ nửa ngày chiều đi khám bệnh"
                else:
                    check_in_time = datetime.combine(w_date, time(13, random.randint(0, 15)))
                    check_out_time = datetime.combine(w_date, time(17, random.randint(0, 30)))
                    note = "Xin nghỉ nửa ngày sáng giải quyết việc riêng"
            
            elif status == "ON_LEAVE":
                note = random.choice(["Nghỉ phép năm đã được duyệt", "Nghỉ ốm có giấy bác sĩ"])
            
            elif status == "ABSENT":
                note = "Nghỉ không phép / Không thấy điểm danh"

            # Tính toán các chỉ số phút làm việc (minutes)
            worked_minutes = 0
            late_minutes = 0
            early_leave_minutes = 0
            overtime_minutes = 0

            shift_start = datetime.combine(w_date, time(8, 0))
            shift_end = datetime.combine(w_date, time(17, 0))

            if check_in_time and check_out_time:
                total_span_minutes = int((check_out_time - check_in_time).total_seconds() // 60)
                # Trừ 60 phút nghỉ trưa nếu ca trải qua khung 12:00 - 13:00
                if check_in_time < datetime.combine(w_date, time(12, 0)) and check_out_time > datetime.combine(w_date, time(13, 0)):
                    worked_minutes = max(0, total_span_minutes - 60)
                else:
                    worked_minutes = max(0, total_span_minutes)

                # Số phút đi muộn (sau 08:00)
                if check_in_time > shift_start:
                    late_minutes = int((check_in_time - shift_start).total_seconds() // 60)

                # Số phút về sớm (trước 17:00)
                if check_out_time < shift_end:
                    early_leave_minutes = int((shift_end - check_out_time).total_seconds() // 60)

                # Số phút làm thêm (sau 17:00)
                if check_out_time > shift_end:
                    overtime_minutes = int((check_out_time - shift_end).total_seconds() // 60)

            # Thời điểm tạo bản ghi (lúc 8h sáng ngày hôm đó)
            record_time = datetime.combine(w_date, time(8, 0))
            new_id = snowflake.next_id()

            cursor.execute(
                """
                INSERT INTO attendance (
                    id, employee_id, work_date, work_shift_id, 
                    check_in_time, check_out_time, worked_minutes, 
                    late_minutes, early_leave_minutes, overtime_minutes, 
                    status, source, approved_by, approved_at, 
                    note, created_by, updated_by, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    new_id,
                    emp_id,
                    w_date,
                    shift_id,
                    check_in_time,
                    check_out_time,
                    worked_minutes,
                    late_minutes,
                    early_leave_minutes,
                    overtime_minutes,
                    status,
                    "DEVICE",      # source (mặc định DEVICE)
                    admin_id,      # approved_by
                    record_time,   # approved_at
                    note,
                    admin_id,      # created_by
                    None,          # updated_by
                    record_time,   # created_at
                    record_time,   # updated_at
                ),
            )
            total_inserted += 1

    print(f"   [completed] Đã seed xong attendance! Inserted: {total_inserted} records | Skipped: {total_skipped} records.")