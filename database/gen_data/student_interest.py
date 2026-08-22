"""Đồng bộ sở thích học tập có chủ đích cho 50 học viên dataset."""

from identity_dataset import PEOPLE, student_profile


def get_students(cursor) -> dict[str, int]:
    """Lấy ID thật của toàn bộ học viên dataset."""
    usernames = tuple(person["username"] for person in PEOPLE if person["role"] == "STUDENT")
    placeholders = ",".join(["%s"] * len(usernames))
    cursor.execute(f"SELECT id, username FROM user WHERE username IN ({placeholders})", usernames)
    students = {row["username"]: row["id"] for row in cursor.fetchall()}
    if len(students) != 50:
        raise ValueError(f"Cần đủ 50 students trước khi seed interests, hiện có {len(students)}")
    return students


def get_interests(cursor) -> dict[str, int]:
    """Lấy interest ID thật theo code master data."""
    required_codes = {
        code
        for person in PEOPLE
        if person["role"] == "STUDENT"
        for code in student_profile(person)["interest_codes"]
    }
    placeholders = ",".join(["%s"] * len(required_codes))
    cursor.execute(
        f"SELECT id, code FROM interest WHERE code IN ({placeholders})",
        tuple(sorted(required_codes)),
    )
    interests = {row["code"]: row["id"] for row in cursor.fetchall()}
    missing = required_codes - interests.keys()
    if missing:
        raise ValueError(f"Thiếu interest master data: {sorted(missing)}")
    return interests


def synchronize_interest(cursor, student_id: int, interest_id: int, code: str, timestamp) -> bool:
    """Upsert một cặp student-interest theo composite key của backend."""
    cursor.execute(
        "SELECT 1 FROM student_interest WHERE student_user_id=%s AND interest_id=%s",
        (student_id, interest_id),
    )
    note = f"Ưu tiên lộ trình thực hành và dự án ứng dụng cho chủ đề {code}."
    if cursor.fetchone():
        cursor.execute(
            """
            UPDATE student_interest
            SET note=%s, updated_by=%s, updated_at=%s
            WHERE student_user_id=%s AND interest_id=%s
            """,
            (note, student_id, timestamp, student_id, interest_id),
        )
        return False
    cursor.execute(
        """
        INSERT INTO student_interest (
            student_user_id, interest_id, note, created_by, updated_by, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, NULL, %s, %s)
        """,
        (student_id, interest_id, note, student_id, timestamp, timestamp),
    )
    return True


def seed(cursor) -> None:
    """Gán chính xác bốn interest phù hợp cho mỗi học viên và loại liên kết seed thừa."""
    print("→ Seeding final-report student interests...")
    students = get_students(cursor)
    interests = get_interests(cursor)
    inserted = 0
    synchronized = 0
    for person in (item for item in PEOPLE if item["role"] == "STUDENT"):
        student_id = students[person["username"]]
        codes = student_profile(person)["interest_codes"]
        desired_ids = tuple(interests[code] for code in codes)
        placeholders = ",".join(["%s"] * len(desired_ids))
        cursor.execute(
            f"DELETE FROM student_interest WHERE student_user_id=%s AND interest_id NOT IN ({placeholders})",
            (student_id, *desired_ids),
        )
        for code, interest_id in zip(codes, desired_ids):
            was_inserted = synchronize_interest(
                cursor,
                student_id,
                interest_id,
                code,
                person["created_at"],
            )
            inserted += int(was_inserted)
            synchronized += int(not was_inserted)
    print(f"   [completed] student_interest: inserted={inserted}, synchronized={synchronized}, total=200")
