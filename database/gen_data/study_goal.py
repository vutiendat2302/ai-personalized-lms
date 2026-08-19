"""Đồng bộ một mục tiêu học tập chung cho mỗi học viên dataset."""

from identity_dataset import PEOPLE
from snowflake_id import snowflake


GOAL_TEMPLATES = (
    ("DAILY_STREAK", 21),
    ("WEEKLY_STUDY_DAYS", 5),
    ("COURSE_COMPLETION", 2),
    ("LESSON_COMPLETION", 30),
    ("STUDY_HOURS", 50),
)


def get_students(cursor) -> dict[str, int]:
    """Lấy ID thật của 50 học viên dataset."""
    usernames = tuple(person["username"] for person in PEOPLE if person["role"] == "STUDENT")
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(f"SELECT id, username FROM user WHERE username IN ({placeholders})", usernames)
    students = {row["username"]: row["id"] for row in cursor.fetchall()}
    if len(students) != 50:
        raise ValueError(f"Cần đủ 50 students trước khi seed study_goal, hiện có {len(students)}")
    return students


def synchronize_goal(cursor, student_id: int, goal_type: str, target: int, timestamp) -> bool:
    """Giữ một mục tiêu chung, bảo toàn ID và chuẩn hóa trạng thái IN_PROGRESS."""
    cursor.execute("SELECT id FROM study_goal WHERE user_id=%s ORDER BY created_at, id", (student_id,))
    rows = cursor.fetchall()
    if rows:
        goal_id = rows[0]["id"]
        if len(rows) > 1:
            extra_ids = tuple(row["id"] for row in rows[1:])
            placeholders = ",".join(["%s"] * len(extra_ids))
            cursor.execute(f"DELETE FROM study_goal WHERE id IN ({placeholders})", extra_ids)
        cursor.execute(
            """
            UPDATE study_goal
            SET goal_type=%s, target_value=%s, course_id=NULL,
                current_streak=0, longest_streak=0, status='IN_PROGRESS',
                updated_by=%s, updated_at=%s
            WHERE id=%s
            """,
            (goal_type, target, student_id, timestamp, goal_id),
        )
        return False

    cursor.execute(
        """
        INSERT INTO study_goal (
            id, user_id, goal_type, target_value, course_id,
            current_streak, longest_streak, status,
            created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, NULL, 0, 0, 'IN_PROGRESS', %s, NULL, %s, %s)
        """,
        (snowflake.next_id(), student_id, goal_type, target, student_id, timestamp, timestamp),
    )
    return True


def seed(cursor) -> None:
    """Tạo đúng một goal enum hợp lệ cho từng student profile."""
    print("→ Seeding final-report study goals...")
    students = get_students(cursor)
    inserted = 0
    synchronized = 0
    for person in (item for item in PEOPLE if item["role"] == "STUDENT"):
        goal_type, target = GOAL_TEMPLATES[(person["ordinal"] - 1) % len(GOAL_TEMPLATES)]
        was_inserted = synchronize_goal(
            cursor,
            students[person["username"]],
            goal_type,
            target,
            person["created_at"],
        )
        inserted += int(was_inserted)
        synchronized += int(not was_inserted)
    print(f"   [completed] study_goal: inserted={inserted}, synchronized={synchronized}, total=50")
