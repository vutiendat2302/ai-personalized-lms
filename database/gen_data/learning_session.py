"""Sinh lịch sử phiên học từ nhật ký hoạt động đã có.

Mỗi học viên/ngày/đối tượng có tối đa một phiên, dùng Snowflake ID và
không ghi đè session phát sinh thật từ ứng dụng.
"""

import random
from datetime import timedelta

from snowflake_id import snowflake

random.seed(4210)


def seed(cursor):
    print("→ Seeding learning_session (phiên học từ activity log)...")
    cursor.execute(
        """
        SELECT l.user_id, l.entity_type, l.entity_id, DATE(l.occurred_at) AS activity_date,
               MIN(l.occurred_at) AS first_activity, MAX(l.occurred_at) AS last_activity
        FROM learning_activity_log l
        JOIN student_profile sp ON sp.user_id = l.user_id
        WHERE l.occurred_at >= CURRENT_DATE - INTERVAL 29 DAY
          AND l.entity_id IS NOT NULL
          AND l.entity_type IN ('LESSON', 'COURSE', 'QUIZ')
        GROUP BY l.user_id, l.entity_type, l.entity_id, DATE(l.occurred_at)
        ORDER BY l.user_id, activity_date
        """
    )
    activity_groups = cursor.fetchall()
    inserted = 0
    skipped = 0

    for group in activity_groups:
        cursor.execute(
            """
            SELECT 1 FROM learning_session
            WHERE user_id = %s AND entity_type = %s AND entity_id = %s
              AND DATE(created_at) = %s
            LIMIT 1
            """,
            (group["user_id"], group["entity_type"], group["entity_id"], group["activity_date"]),
        )
        if cursor.fetchone():
            skipped += 1
            continue

        duration = random.randint(6 * 60, 55 * 60)
        started_at = group["first_activity"] - timedelta(seconds=random.randint(20, 120))
        ended_at = max(group["last_activity"], started_at + timedelta(seconds=duration))
        status = random.choices(
            ["CLOSED", "BEACON_CLOSED", "IDLE_TIMEOUT", "HEARTBEAT_TIMEOUT"],
            weights=[82, 10, 5, 3],
            k=1,
        )[0]
        reasons = {
            "CLOSED": "User ended learning session",
            "BEACON_CLOSED": "Page closed via beacon",
            "IDLE_TIMEOUT": "No interaction for more than 12 minutes",
            "HEARTBEAT_TIMEOUT": "Heartbeat connection timed out",
        }

        cursor.execute(
            """
            INSERT INTO learning_session (
                id, user_id, entity_type, entity_id, active_seconds, status,
                close_reason, last_heartbeat_at, last_interaction_at,
                created_at, created_by, updated_at, updated_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, NULL)
            """,
            (
                snowflake.next_id(), group["user_id"], group["entity_type"], group["entity_id"],
                duration, status, reasons[status], ended_at, ended_at,
                started_at, ended_at,
            ),
        )
        inserted += 1

    print(f"   [completed] learning_session — Inserted: {inserted} | Skipped: {skipped}.")
