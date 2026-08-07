"""
seed_course_teachers.py
------------------------
Seed dữ liệu cho bảng `course_teacher` (Phân công Giảng viên phụ trách khóa học).
- course_id: Lấy từ bảng `course`.
- user_id: Lấy user_id của giảng viên từ bảng `teacher_category` / `employee`.
- status: 80% ACTIVE (Giảng viên chính thức), 10% PENDING (Chờ duyệt), 5% REJECTED, 5% INACTIVE.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime, timedelta

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

STATUS_POOL = (
    ["ACTIVE"] * 80
    + ["PENDING"] * 10
    + ["REJECTED"] * 5
    + ["INACTIVE"] * 5
)


def get_courses(cursor):
    """Lấy danh sách ID khóa học và created_by từ bảng course."""
    query = "SELECT id, created_by, created_at FROM course LIMIT 3000"
    try:
        cursor.execute(query)
        return cursor.fetchall()
    except Exception as e:
        print(f"   [error] Lỗi khi query course: {e}")
        return []


def get_teachers_by_category(cursor):
    """Lấy mapping danh mục với danh sách user_id giảng viên thuộc danh mục đó."""
    query = """
        SELECT DISTINCT e.user_id, tc.category_id
        FROM teacher_category tc
        JOIN employee e ON tc.employee_id = e.id
        WHERE tc.status = 'ACTIVE'
    """
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        cat_map = {}
        for r in rows:
            cid = r["category_id"]
            uid = r["user_id"]
            if cid not in cat_map:
                cat_map[cid] = []
            cat_map[cid].append(uid)
        return cat_map
    except Exception as e:
        print(f"   [error] Lỗi khi query teacher_category: {e}")
        return {}


def get_all_teacher_user_ids(cursor):
    """Lấy tất cả user_id của giảng viên từ bảng employee."""
    query = "SELECT DISTINCT user_id FROM employee WHERE user_id IS NOT NULL"
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        return [r["user_id"] for r in rows]
    except Exception:
        return []


def seed(cursor):
    print("→ Seeding course_teacher (Phân công Giảng viên phụ trách khóa học)...")

    courses = get_courses(cursor)
    if not courses:
        print("   [warning] Bảng `course` chưa có dữ liệu!")
        return

    all_teachers = get_all_teacher_user_ids(cursor)
    if not all_teachers:
        print("   [warning] Không tìm thấy giảng viên trong bảng `employee`!")
        return

    # Check if table already has data
    try:
        cursor.execute("SELECT COUNT(*) as total FROM course_teacher")
        count_row = cursor.fetchone()
        if count_row and count_row["total"] > 1000:
            print(f"   [skip] DB đã có sẵn {count_row['total']} bản ghi course_teacher. Bỏ qua.")
            return
    except Exception:
        pass

    total_inserted = 0

    for c in courses:
        course_id = c["id"]
        created_by = c["created_by"]
        created_at = c["created_at"] or datetime.now()

        assigned_users = set()

        # 1. Nếu người tạo là giảng viên, tự động thêm bản ghi Giảng viên chính với status ACTIVE
        if created_by in all_teachers:
            cursor.execute(
                """
                INSERT IGNORE INTO course_teacher (course_id, user_id, assigned_at, assigned_by, status)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (course_id, created_by, created_at, created_by, "ACTIVE")
            )
            assigned_users.add(created_by)
            total_inserted += 1

        # 2. Ngẫu nhiên mời thêm 0 đến 2 giảng viên đồng phụ trách với các trạng thái ngẫu nhiên
        extra_count = random.choices([0, 1, 2], weights=[60, 30, 10])[0]
        candidate_pool = [uid for uid in all_teachers if uid not in assigned_users]

        if extra_count > 0 and candidate_pool:
            selected_teachers = random.sample(candidate_pool, min(extra_count, len(candidate_pool)))
            for teacher_uid in selected_teachers:
                status = random.choice(STATUS_POOL)
                assigned_at = created_at + timedelta(days=random.randint(1, 30))
                
                cursor.execute(
                    """
                    INSERT IGNORE INTO course_teacher (course_id, user_id, assigned_at, assigned_by, status)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (course_id, teacher_uid, assigned_at, created_by or teacher_uid, status)
                )
                total_inserted += 1

    print(f"   [completed] Hoàn tất seed course_teacher! Đã insert {total_inserted} bản ghi.")
