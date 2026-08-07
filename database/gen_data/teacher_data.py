"""
Seed data generator script for Teacher and TA Portal operations.
Generates realistic Vietnamese teacher profiles, online teaching sessions, session payments, assignment submissions, fill-in-blank quiz answers, and at-risk student indicators.
"""

import random
from datetime import datetime, timedelta
from decimal import Decimal
from snowflake_id import snowflake

RNG = random.Random(20260803)

TEACHER_PROFILES = [
    {"name": "Vũ Tiến Đạt", "email": "vutiendat@ailms.edu.vn", "role": "TEACHER", "rate": 350000},
    {"name": "Nguyễn Văn Hùng", "email": "hung.nguyen@ailms.edu.vn", "role": "TEACHER", "rate": 300000},
    {"name": "Trần Bảo Nam", "email": "nam.tran@ailms.edu.vn", "role": "TEACHER", "rate": 320000},
    {"name": "Lê Minh Triết", "email": "triet.le@ailms.edu.vn", "role": "TA", "rate": 180000},
    {"name": "Phạm Quốc Hùng", "email": "hung.pham@ailms.edu.vn", "role": "TA", "rate": 180000},
]

ONLINE_SESSIONS = [
    {
        "class_code": "CLASS-REACT-01",
        "class_name": "Lớp ReactJS & NextJS K14",
        "course_name": "Lập trình ReactJS & NextJS Chuyên Sâu",
        "teacher": "Vũ Tiến Đạt",
        "ta": "Lê Minh Triết",
        "day_of_week": "MONDAY",
        "start_time": "19:30",
        "end_time": "21:30",
        "status": "LIVE",
    },
    {
        "class_code": "CLASS-AI-02",
        "class_name": "Lớp LLM & RAG System Intensive",
        "course_name": "Trí Tuệ Nhân Tạo & LLM Production",
        "teacher": "Nguyễn Văn Hùng",
        "ta": "Phạm Quốc Hùng",
        "day_of_week": "TUESDAY",
        "start_time": "20:00",
        "end_time": "22:00",
        "status": "UPCOMING",
    },
]

def generate_teacher_seed_sql():
    """Outputs SQL statements for teacher operational data"""
    sql_lines = []
    now = datetime.now()

    sql_lines.append("-- Seeding Teacher and TA Portal Data")
    for t in TEACHER_PROFILES:
        t_id = snowflake.next_id()
        sql_lines.append(
            f"INSERT INTO employee (id, full_name, email, hourly_rate, created_at, updated_at) "
            f"VALUES ({t_id}, '{t['name']}', '{t['email']}', {t['rate']}, '{now}', '{now}') "
            f"ON CONFLICT DO NOTHING;"
        )

    return "\n".join(sql_lines)

if __name__ == "__main__":
    print(generate_teacher_seed_sql())
