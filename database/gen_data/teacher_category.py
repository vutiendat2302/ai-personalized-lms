"""
seed_teacher_categories.py
---------------------------
Seed dữ liệu cho bảng `teacher_category` (Phân công chuyên môn cho Giảng viên).
- employee_id: Lấy từ bảng `employee` (chỉ lọc role TEACHER hoặc TA).
- category_id: Lấy từ bảng `category`.
- Mỗi giảng viên được phân công từ 2 - 3 lĩnh vực/môn học ngẫu nhiên.
- status: 90% ACTIVE (unassigned_at = NULL), 10% INACTIVE (có thời điểm unassigned_at).
- assigned_by & created_by: Lấy ID của Admin.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime, timedelta
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

# Tỉ lệ status: 90% ACTIVE, 10% INACTIVE
STATUS_POOL = ["ACTIVE"] * 90 + ["INACTIVE"] * 10


def get_admin_id(cursor):
    """Lấy ID của Admin để gán vào assigned_by và created_by."""
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


def get_eligible_teachers(cursor):
    """
    Lấy danh sách user_id từ bảng employee có role là TEACHER hoặc TA.
    """
    query = """
        SELECT DISTINCT e.user_id as id 
        FROM employee e
        JOIN user_role ur ON e.user_id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code IN ('TEACHER', 'TA')
    """
    try:
        cursor.execute(query)
        return sorted([row["id"] for row in cursor.fetchall()])
    except Exception:
        # Fallback phòng hờ nếu query trên lỗi thì lấy toàn bộ từ bảng employee
        cursor.execute("SELECT user_id as id FROM employee")
        return sorted([row["id"] for row in cursor.fetchall()])


def get_all_categories(cursor):
    """Lấy danh sách id và tên từ bảng category."""
    try:
        cursor.execute("SELECT id, name FROM category")
    except Exception:
        # Fallback nếu cột tên trong DB là title hay category_name
        cursor.execute("SELECT id FROM category")
    return cursor.fetchall()


def check_teacher_category_exists(cursor, employee_id: int, category_id: int):
    """Kiểm tra giảng viên đã được gán chuyên môn này chưa (Idempotent)."""
    query = """
        SELECT id FROM teacher_category 
        WHERE employee_id = %s AND category_id = %s 
        LIMIT 1
    """
    cursor.execute(query, (employee_id, category_id))
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    print("→ Seeding teacher_category (Phân công chuyên môn giảng viên)...")

    # 1. Lấy ID Admin
    admin_id = get_admin_id(cursor)
    if not admin_id:
        print("   [warning] Không tìm thấy user ADMIN! Tạm để NULL cho assigned_by/created_by.")
        admin_id = None

    # 2. Lấy danh sách giảng viên & trợ giảng
    teachers = get_eligible_teachers(cursor)
    if not teachers:
        print("   [warning] Không tìm thấy nhân viên nào có role TEACHER hoặc TA trong bảng employee!")
        return

    # 3. Lấy danh sách danh mục chuyên môn
    categories = list(get_all_categories(cursor))
    if not categories:
        print("   [warning] Bảng `category` đang trống! Hãy chắc chắn đã chạy seed cho bảng `category` trước.")
        return

    total_categories_available = len(categories)
    print(f"   [info] Tìm thấy {len(teachers)} giảng viên/trợ giảng và {total_categories_available} danh mục chuyên môn.")

    total_inserted = 0
    total_skipped = 0

    # 4. Lặp qua từng giảng viên để gán chuyên môn
    for emp_id in teachers:
        # Mỗi giảng viên nhận 2 đến 3 chuyên môn ngẫu nhiên
        desired_count = random.randint(2, 3)
        actual_count = min(desired_count, total_categories_available)
        
        # Bốc ngẫu nhiên actual_count danh mục KHÔNG TRÙNG LẶP cho giảng viên này
        selected_categories = random.sample(categories, actual_count)

        for item in selected_categories:
            cat_id = item["id"]
            cat_name = item.get("name", f"ID:{cat_id}")

            # Check idempotent
            if check_teacher_category_exists(cursor, emp_id, cat_id):
                total_skipped += 1
                continue

            status = random.choice(STATUS_POOL)
            
            # Xử lý thời gian
            days_ago = random.randint(30, 365)
            created_at = datetime.now() - timedelta(days=days_ago)
            
            # Nếu INACTIVE thì thời điểm hủy phân công nằm sau thời điểm gán vài tháng
            if status == "INACTIVE":
                unassigned_days = random.randint(1, days_ago - 1) if days_ago > 1 else 0
                unassigned_at = created_at + timedelta(days=unassigned_days)
            else:
                unassigned_at = None

            new_id = snowflake.next_id()

            # 5. Insert vào DB
            cursor.execute(
                """
                INSERT INTO teacher_category (
                    id, employee_id, category_id, assigned_by, unassigned_at, 
                    status, created_by, updated_by, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    new_id,
                    emp_id,
                    cat_id,
                    admin_id,       # assigned_by = ID Admin
                    unassigned_at,  # NULL nếu ACTIVE
                    status,
                    admin_id,       # created_by
                    None,           # updated_by
                    created_at,
                    created_at if not unassigned_at else unassigned_at
                ),
            )
            total_inserted += 1
            print(f"   [insert] Teacher ID: {emp_id:<18} | Category: {str(cat_name):<20} | Status: {status:<8} (id={new_id})")

    print(f"   [completed] Đã seed xong teacher_category! Inserted: {total_inserted} | Skipped: {total_skipped}.")