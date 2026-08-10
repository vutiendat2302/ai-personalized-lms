"""Sinh một mục tiêu học tập chung cho mỗi học viên.

Quy tắc dữ liệu:
- Mỗi ``student_profile`` chỉ có tối đa một bản ghi mục tiêu.
- ``course_id`` luôn là ``NULL``; mục tiêu không gắn với khóa học.
- Một học viên chỉ nhận một ``goal_type`` (các học viên khác nhau có thể chọn loại khác).
- Chạy lại script không tạo bản ghi trùng.
"""

import random
from datetime import datetime

from snowflake_id import snowflake

random.seed(42)

GOAL_TYPES = (
    "DAILY_STREAK",
    "WEEKLY_STUDY_DAYS",
    "COURSE_COMPLETION",
    "LESSON_COMPLETION",
    "STUDY_HOURS",
)


def get_student_ids(cursor):
    """Lấy các học viên đã có hồ sơ để gắn mục tiêu."""
    cursor.execute("SELECT user_id FROM student_profile ORDER BY user_id")
    return [row["user_id"] for row in cursor.fetchall()]


def has_goal(cursor, user_id):
    """Kiểm tra học viên đã có bất kỳ mục tiêu nào hay chưa."""
    cursor.execute("SELECT 1 FROM study_goal WHERE user_id = %s LIMIT 1", (user_id,))
    return cursor.fetchone() is not None


def goal_target(goal_type, index):
    """Sinh giá trị mục tiêu dương, phù hợp với loại mục tiêu."""
    targets = {
        "DAILY_STREAK": (7, 14, 21, 30),
        "WEEKLY_STUDY_DAYS": (3, 4, 5, 6),
        "COURSE_COMPLETION": (1, 2, 3),
        "LESSON_COMPLETION": (10, 20, 30, 50),
        "STUDY_HOURS": (15, 30, 50, 100),
    }
    values = targets[goal_type]
    return values[index % len(values)]


def seed(cursor):
    """Tạo dữ liệu mục tiêu idempotent theo quy tắc một mục tiêu chung."""
    print("→ Seeding study_goal (mỗi học viên một mục tiêu chung)...")
    students = get_student_ids(cursor)
    if not students:
        print("   [warning] Không có student_profile để seed study_goal.")
        return

    inserted = 0
    skipped = 0
    now = datetime.now()

    for index, user_id in enumerate(students):
        if has_goal(cursor, user_id):
            skipped += 1
            continue

        goal_type = GOAL_TYPES[index % len(GOAL_TYPES)]
        target_value = goal_target(goal_type, index)
        status = "IN_PROGRESS"
        current_streak = 0
        longest_streak = 0

        cursor.execute(
            """
            INSERT INTO study_goal (
                id, user_id, goal_type, target_value, course_id,
                current_streak, longest_streak, status,
                created_by, updated_by, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, NULL, %s, %s, %s, %s, NULL, %s, %s)
            """,
            (
                snowflake.next_id(),
                user_id,
                goal_type,
                target_value,
                current_streak,
                longest_streak,
                status,
                user_id,
                now,
                now,
            ),
        )
        inserted += 1
        print(f"   [insert] user={user_id} type={goal_type} target={target_value}")

    print(f"   [completed] study_goal: inserted={inserted}, skipped={skipped}")
