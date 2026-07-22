"""
seed_study_goals.py
--------------------
Seed dữ liệu cho bảng `study_goal` (Mục tiêu học tập).
- user_id lấy từ bảng `student_profile`.
- Phân bổ đều 5 loại studyGoalTypeEnum (mỗi loại 20%).
- target_value, current_streak, longest_streak sinh logic bám sát thực tế.
- course_id mặc định để NULL 100%.
- status: 75% IN_PROGRESS, 20% COMPLETED, 5% CANCELLED.
- created_by lấy chính user_id của học viên.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime, timedelta
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
random.seed(42)
# -----------------------------------------

# 5 loại mục tiêu chia đều 20% mỗi loại
GOAL_TYPES = [
    "DAILY_STREAK",
    "WEEKLY_STUDY_DAYS",
    "COURSE_COMPLETION",
    "LESSON_COMPLETION",
    "STUDY_HOURS"
]

# Tỉ lệ trạng thái: 75% Đang làm, 20% Hoàn thành, 5% Hủy
STATUS_POOL = (
    ["IN_PROGRESS"] * 75 + ["COMPLETED"] * 20 + ["CANCELLED"] * 5
)


def get_all_student_ids(cursor):
    """Lấy danh sách user_id từ bảng student_profile."""
    cursor.execute("SELECT user_id FROM student_profile")
    return sorted([row["user_id"] for row in cursor.fetchall()])


def check_goal_exists(cursor, user_id: int):
    """Kiểm tra học viên đã có mục tiêu học tập chưa (Idempotent)."""
    cursor.execute(
        "SELECT id FROM study_goal WHERE user_id = %s LIMIT 1",
        (user_id,),
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    print("→ Seeding study_goals (Mục tiêu học tập của học viên)...")

    # 1. Lấy danh sách học viên
    students = get_all_student_ids(cursor)
    if not students:
        print("   [warning] Bảng `student_profile` đang trống! Hãy chạy seed_student_profiles trước.")
        return

    total_students = len(students)
    print(f"   [info] Tìm thấy {total_students} học viên để tạo mục tiêu học tập.")

    total_inserted = 0
    total_skipped = 0

    # 2. Lặp qua danh sách học viên để tạo mục tiêu
    for idx, user_id in enumerate(students):
        # Check idempotent
        if check_goal_exists(cursor, user_id):
            total_skipped += 1
            continue

        # Chọn đều các loại mục tiêu bằng cách chia lấy dư theo index (hoặc random.choice)
        goal_type = GOAL_TYPES[idx % len(GOAL_TYPES)]
        status = random.choice(STATUS_POOL)

        # 3. Logic target_value và streak theo từng loại mục tiêu
        if goal_type == "DAILY_STREAK":
            target_value = random.choice([7, 14, 21, 30])  # 7 -> 30 ngày liên tiếp
        elif goal_type == "WEEKLY_STUDY_DAYS":
            target_value = random.randint(3, 6)            # 3 -> 6 ngày/tuần
        elif goal_type == "COURSE_COMPLETION":
            target_value = random.randint(1, 3)            # 1 -> 3 khóa học
        elif goal_type == "LESSON_COMPLETION":
            target_value = random.choice([10, 20, 30, 50]) # 10 -> 50 bài học
        else:  # STUDY_HOURS
            target_value = random.choice([15, 30, 50, 100])# 15 -> 100 giờ học

        # 4. Logic sinh current_streak và longest_streak thực tế
        if status == "COMPLETED":
            # Đã hoàn thành thì longest_streak ít nhất phải bằng hoặc vượt target
            longest_streak = max(target_value, random.randint(10, 45))
            current_streak = random.randint(0, longest_streak)
        elif status == "CANCELLED":
            # Đã hủy thì streak thường thấp
            longest_streak = random.randint(1, 5)
            current_streak = 0
        else:  # IN_PROGRESS
            # Đang tiến hành thì longest chưa vượt quá target (hoặc đang trên đường đạt)
            longest_streak = random.randint(1, max(target_value + 5, 10))
            current_streak = random.randint(0, longest_streak)

        # course_id mặc định để NULL 100%
        course_id = None

        now = datetime.now()
        new_id = snowflake.next_id()

        # 5. Insert vào DB
        cursor.execute(
            """
            INSERT INTO study_goal (
                id, user_id, goal_type, target_value, course_id, 
                current_streak, longest_streak, status, 
                created_by, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                new_id,
                user_id,
                goal_type,
                target_value,
                course_id,
                current_streak,
                longest_streak,
                status,
                user_id,   # ---> created_by = user_id của học viên
                None,      # ---> updated_by = NULL
                now,       # ---> created_at
                now,       # ---> updated_at
            ),
        )
        total_inserted += 1
        print(f"   [insert] UID: {user_id:<18} | Type: {goal_type:<18} | Target: {target_value:<3} | Streak: {current_streak}/{longest_streak} | {status}")

    print(f"   [completed] Đã seed xong study_goal! Inserted: {total_inserted} | Skipped: {total_skipped}.")