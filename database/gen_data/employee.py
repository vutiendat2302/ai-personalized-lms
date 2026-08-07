"""
seed_employees.py
------------------
Seed dữ liệu cho bảng `employee`.
- Khóa chính là `user_id` (1-1 với user).
- Chỉ lấy user có role HR, TEACHER, TA.
- TA -> PART_TIME; HR, TEACHER -> FULL_TIME.
- Trạng thái: 80% ACTIVE, 10% ON_LEAVE, 3% TERMINATED, 
- employee_code format: EP-{MMyy}-{6 alphanumeric}.
- Có đầy đủ các cột của BaseEntity (created_by lấy ID Admin).
- Cố định seed 100% (random.seed(42)).
"""

import random
import string
from datetime import datetime, timedelta
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------


def get_admin_id(cursor):
    """Lấy ID của Admin để làm created_by."""
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


def get_eligible_users_with_roles(cursor):
    """
    Lấy danh sách user_id và role code tương ứng (chỉ HR, TEACHER, TA).
    Nếu 1 user mang nhiều role thì ưu tiên lấy role cao nhất theo thứ tự: TEACHER -> HR -> TA.
    """
    query = """
        SELECT ur.user_id, r.code as role_code
        FROM user_role ur
        JOIN role r ON ur.role_id = r.id
        WHERE r.code IN ('HR', 'TEACHER', 'TA')
    """
    cursor.execute(query)
    rows = cursor.fetchall()

    # Dùng dict để loại bỏ trùng lặp user_id nếu 1 user có 2 role
    user_role_map = {}
    for r in rows:
        uid = r["user_id"]
        code = r["role_code"]
        if uid not in user_role_map:
            user_role_map[uid] = code
        else:
            # Ưu tiên TEACHER hoặc HR hơn TA
            if code in ["TEACHER", "HR"]:
                user_role_map[uid] = code

    # Trả về list tuple (user_id, role_code) đã sắp xếp theo ID để cố định 100%
    return sorted(list(user_role_map.items()), key=lambda x: x[0])


def get_all_departments(cursor):
    """Lấy danh sách ID của các phòng ban từ bảng department."""
    cursor.execute("SELECT id FROM department")
    return [row["id"] for row in cursor.fetchall()]


def check_employee_exists(cursor, user_id: int):
    """Kiểm tra xem nhân viên này đã tồn tại trong bảng employee chưa."""
    cursor.execute("SELECT user_id FROM employee WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    return row["user_id"] if row else None


def generate_employee_code(start_date: datetime):
    """Sinh mã nhân viên dạng EP-{MMyy}-{6 số/chữ ngẫu nhiên}."""
    mmyy = start_date.strftime("%m%y")
    # Tạo chuỗi 6 ký tự gồm chữ in hoa và số
    random_str = "".join(
        random.choices(string.ascii_uppercase + string.digits, k=6)
    )
    return f"EP-{mmyy}-{random_str}"


def seed(cursor):
    print("→ Seeding employees...")

    # 1. Lấy ID Admin
    admin_id = get_admin_id(cursor)
    if not admin_id:
        print("   [warning] Không tìm thấy user ADMIN! Tạm để NULL cho created_by.")

    # 2. Lấy danh sách user đủ điều kiện (HR, TEACHER, TA)
    users = get_eligible_users_with_roles(cursor)
    if not users:
        print("   [warning] Không tìm thấy user nào có role HR, TEACHER hoặc TA!")
        return

    # 3. Lấy danh sách department
    departments = get_all_departments(cursor)
    if not departments:
        print("   [warning] Bảng `department` trống! Tạm thời để department_id = NULL.")

    total_emp = len(users)

    # 4. Phân bổ Status: 80% ACTIVE, 10% ON_LEAVE, 3% TERMINATED,
    active_count = int(total_emp * 0.80)
    leave_count = int(total_emp * 0.15)
    terminated_count = total_emp - (active_count + leave_count)

    statuses = (
        ["ACTIVE"] * active_count
        + ["ON_LEAVE"] * leave_count
        + ["TERMINATED"] * terminated_count
    )
    random.shuffle(statuses)

    # 5. Tiến hành lặp và insert
    for idx, (user_id, role_code) in enumerate(users):
        # Check idempotent
        if check_employee_exists(cursor, user_id):
            print(f"   [skip] Employee với user_id={user_id} đã tồn tại")
            continue

        status = statuses[idx]

        # Logic Employment Type và Position dựa theo Role
        if role_code == "TA":
            emp_type = "PART_TIME"
            position = "Trợ giảng"
        elif role_code == "TEACHER":
            emp_type = "FULL_TIME"
            position = "Giảng viên"
        else:  # HR
            emp_type = "FULL_TIME"
            position = "Chuyên viên Nhân sự"

        # Xử lý Department (Chọn random 1 phòng ban nếu có)
        dept_id = random.choice(departments) if departments else None

        # Xử lý Ngày bắt đầu (start_date) trong khoảng 1-3 năm qua
        days_ago = random.randint(30, 1000)
        start_date = datetime.now() - timedelta(
            days=days_ago, hours=random.randint(0, 23)
        )

        # Xử lý Ngày nghỉ việc (end_date) logic theo status
        if status in ["TERMINATED"]:
            # Nghỉ việc sau khi làm được một khoảng thời gian
            work_days = random.randint(10, days_ago - 1) if days_ago > 10 else 1
            end_date = start_date + timedelta(days=work_days)
        else:
            end_date = None

        # Sinh mã nhân viên
        emp_code = generate_employee_code(start_date)

        # Insert vào DB (Bao gồm đầy đủ các cột của BaseEntity)
        cursor.execute(
            """
            INSERT INTO employee (
                user_id, employee_code, department_id, position, 
                employment_type, start_date, end_date, status, 
                created_by, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                emp_code,
                dept_id,
                position,
                emp_type,
                start_date,
                end_date,
                status,
                admin_id,    # created_by
                None,        # updated_by
                start_date,  # created_at
                start_date,  # updated_at
            ),
        )

        print(
            f"   [insert] {emp_code:<15} | Role: {role_code:<7} | Type: {emp_type:<9} | Status: {status:<10} | UID: {user_id}"
        )