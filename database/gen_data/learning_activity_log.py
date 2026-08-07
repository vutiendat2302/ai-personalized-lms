"""Sinh nhật ký hoạt động thật để biểu diễn dashboard quản lý học viên.

Dữ liệu cố định, idempotent theo user/ngày: bổ sung các ngày còn thiếu trong 30 ngày gần nhất.
Một phần học viên được để không hoạt động 8-25 ngày nhằm kiểm thử cảnh báo.
"""

import json
import random
from datetime import datetime, timedelta

from snowflake_id import snowflake

random.seed(4206)

EVENTS = [
    ("LESSON_VIEW", "LESSON"),
    ("LESSON_COMPLETE", "LESSON"),
    ("QUIZ_SUBMIT", "QUIZ"),
    ("LEARNING_SESSION_END", "COURSE"),
]
DEVICES = ["Chrome / Windows", "Safari / iOS", "Chrome / Android", "Edge / Windows"]


def seed(cursor):
    print("→ Seeding learning_activity_log (Nhật ký hoạt động học viên)...")
    cursor.execute("SELECT user_id FROM student_profile ORDER BY user_id")
    student_ids = [row["user_id"] for row in cursor.fetchall()]
    cursor.execute("SELECT l.id, cs.course_id FROM lesson l JOIN course_section cs ON cs.id = l.section_id")
    lesson_entities = [(row["id"], row["course_id"]) for row in cursor.fetchall()]
    cursor.execute("SELECT id, course_id FROM quiz WHERE course_id IS NOT NULL")
    quiz_entities = [(row["id"], row["course_id"]) for row in cursor.fetchall()]
    cursor.execute("SELECT id FROM course")
    course_entities = [(row["id"], row["id"]) for row in cursor.fetchall()]
    entity_pools = {"LESSON": lesson_entities, "QUIZ": quiz_entities, "COURSE": course_entities}
    inserted = 0
    skipped = 0

    for index, user_id in enumerate(student_ids):
        inactive_offset = random.randint(8, 25) if index % 6 == 0 else 0
        activity_days = sorted(set(random.randint(0, 29) for _ in range(random.randint(8, 18))))
        # Học viên đang hoạt động luôn có ít nhất một sự kiện hôm nay.
        if inactive_offset == 0:
            activity_days = sorted(set(activity_days + [0]))

        cursor.execute(
            """
            SELECT DISTINCT DATE(occurred_at) AS activity_date
            FROM learning_activity_log
            WHERE user_id = %s AND occurred_at >= %s
            """,
            (user_id, datetime.now() - timedelta(days=30)),
        )
        existing_dates = {row["activity_date"] for row in cursor.fetchall()}

        for days_ago in activity_days:
            if days_ago < inactive_offset:
                continue
            activity_date = (datetime.now() - timedelta(days=days_ago)).date()
            if activity_date in existing_dates:
                skipped += 1
                continue
            event_type, entity_type = random.choice(EVENTS)
            if not entity_pools.get(entity_type):
                continue
            entity_id, course_id = random.choice(entity_pools[entity_type])
            occurred_at = datetime.now() - timedelta(
                days=days_ago, hours=random.randint(0, 20), minutes=random.randint(0, 59)
            )
            metadata = {"course_id": str(course_id)}
            if event_type == "LEARNING_SESSION_END":
                metadata["duration_seconds"] = random.randint(300, 3600)
            cursor.execute(
                """
                INSERT INTO learning_activity_log
                    (id, user_id, event_type, entity_type, entity_id, metadata, device, occurred_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    snowflake.next_id(), user_id, event_type, entity_type,
                    entity_id, json.dumps(metadata), random.choice(DEVICES), occurred_at,
                ),
            )
            inserted += 1
            existing_dates.add(activity_date)

    print(f"   [completed] learning_activity_log — Inserted: {inserted} | Skipped students: {skipped}.")
