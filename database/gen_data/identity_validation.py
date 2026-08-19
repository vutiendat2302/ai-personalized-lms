"""Các chốt kiểm tra toàn vẹn cho giai đoạn User & Profile trước khi commit."""

from datetime import date

from identity_dataset import PEOPLE, ROLE_LAYOUT


def mysql_boolean(value) -> bool:
    """Chuẩn hóa BOOLEAN/BIT MySQL do PyMySQL trả về dưới dạng số, bytes hoặc chuỗi."""
    if isinstance(value, (bytes, bytearray, memoryview)):
        return int.from_bytes(bytes(value), byteorder="big") != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _dataset_usernames() -> tuple[str, ...]:
    """Trả toàn bộ username cố định để mọi kiểm tra chỉ giới hạn trong dataset."""
    return tuple(person["username"] for person in PEOPLE)


def _placeholders(values) -> str:
    """Tạo danh sách placeholder SQL an toàn theo số phần tử."""
    return ",".join(["%s"] * len(values))


def validate_users_and_roles(cursor) -> None:
    """Xác nhận đủ 100 user và đúng phân bố role đã thiết kế."""
    usernames = _dataset_usernames()
    cursor.execute(
        f"SELECT COUNT(*) AS total FROM user WHERE username IN ({_placeholders(usernames)})",
        usernames,
    )
    total = cursor.fetchone()["total"]
    if total != 100:
        raise ValueError(f"Validation user thất bại: expected=100, actual={total}")

    cursor.execute(
        f"""
        SELECT r.code, COUNT(DISTINCT u.id) AS total
        FROM user u
        JOIN user_role ur ON ur.user_id=u.id
        JOIN role r ON r.id=ur.role_id
        WHERE u.username IN ({_placeholders(usernames)})
        GROUP BY r.code
        """,
        usernames,
    )
    actual = {row["code"]: row["total"] for row in cursor.fetchall()}
    expected = {role: count for role, _, count in ROLE_LAYOUT}
    if actual != expected:
        raise ValueError(f"Validation role thất bại: expected={expected}, actual={actual}")


def validate_profiles(cursor) -> None:
    """Xác nhận đủ 50 employee, 50 student và tuổi khớp cờ is_minor."""
    usernames = _dataset_usernames()
    params = usernames
    placeholders = _placeholders(usernames)
    cursor.execute(
        f"SELECT COUNT(*) AS total FROM employee e JOIN user u ON u.id=e.user_id WHERE u.username IN ({placeholders})",
        params,
    )
    employee_total = cursor.fetchone()["total"]
    cursor.execute(
        f"""
        SELECT u.date_of_birth, sp.is_minor
        FROM student_profile sp JOIN user u ON u.id=sp.user_id
        WHERE u.username IN ({placeholders})
        """,
        params,
    )
    students = cursor.fetchall()
    if employee_total != 50 or len(students) != 50:
        raise ValueError(f"Validation profile thất bại: employees={employee_total}, students={len(students)}")
    for row in students:
        birth_date = row["date_of_birth"].date() if hasattr(row["date_of_birth"], "date") else row["date_of_birth"]
        birthday_18 = date(birth_date.year + 18, birth_date.month, birth_date.day)
        expected_minor = birthday_18 > date(2026, 8, 15)
        if mysql_boolean(row["is_minor"]) != expected_minor:
            raise ValueError(f"Validation is_minor thất bại cho ngày sinh {birth_date}")


def validate_assets(cursor) -> None:
    """Xác nhận avatar và hợp đồng đều có metadata hợp lệ trong DB."""
    usernames = _dataset_usernames()
    placeholders = _placeholders(usernames)
    cursor.execute(
        f"""
        SELECT COUNT(DISTINCT u.id) AS total
        FROM user u
        JOIN file_metadata fm ON fm.file_key=u.avatar_url
        WHERE u.username IN ({placeholders})
          AND fm.usage_type='AVATAR' AND fm.file_type='IMAGE' AND fm.status='ACTIVE'
          AND fm.reference_entity_id=u.id AND fm.reference_entity_type='UserEntity'
        """,
        usernames,
    )
    avatar_total = cursor.fetchone()["total"]
    cursor.execute(
        f"""
        SELECT COUNT(DISTINCT u.id) AS total
        FROM user u
        JOIN employee e ON e.user_id=u.id
        JOIN employee_contract ec ON ec.employee_id=e.user_id
        JOIN file_metadata fm ON fm.id=ec.file_metadata_id AND fm.file_key=ec.file_key
        WHERE u.username IN ({placeholders})
          AND fm.usage_type='CONTRACT' AND fm.file_type='DOCUMENT' AND fm.status='ACTIVE'
          AND fm.reference_entity_id=ec.id AND fm.reference_entity_type='EmployeeContract'
        """,
        usernames,
    )
    contract_total = cursor.fetchone()["total"]
    if avatar_total != 100 or contract_total != 50:
        raise ValueError(f"Validation asset thất bại: avatars={avatar_total}, contracts={contract_total}")


def validate_student_personalization(cursor) -> None:
    """Xác nhận guardian, bốn interest và một study goal cho từng học viên."""
    student_usernames = tuple(person["username"] for person in PEOPLE if person["role"] == "STUDENT")
    placeholders = _placeholders(student_usernames)
    cursor.execute(
        f"""
        SELECT u.id, sp.is_minor,
               COUNT(DISTINCT g.id) AS guardian_count,
               COUNT(DISTINCT si.interest_id) AS interest_count,
               COUNT(DISTINCT sg.id) AS goal_count
        FROM user u
        JOIN student_profile sp ON sp.user_id=u.id
        LEFT JOIN guardian g ON g.student_user_id=u.id
        LEFT JOIN student_interest si ON si.student_user_id=u.id
        LEFT JOIN study_goal sg ON sg.user_id=u.id
        WHERE u.username IN ({placeholders})
        GROUP BY u.id, sp.is_minor
        """,
        student_usernames,
    )
    rows = cursor.fetchall()
    if len(rows) != 50:
        raise ValueError(f"Validation personalization thiếu student: actual={len(rows)}")
    for row in rows:
        guardian_valid = (
            row["guardian_count"] >= 1
            if mysql_boolean(row["is_minor"])
            else row["guardian_count"] == 0
        )
        if not guardian_valid or row["interest_count"] != 4 or row["goal_count"] != 1:
            raise ValueError(f"Validation personalization thất bại cho student_id={row['id']}: {row}")


def validate(cursor) -> None:
    """Chạy toàn bộ chốt kiểm tra và ngăn commit nếu dữ liệu không đạt chuẩn."""
    print("→ Validating final-report identity dataset...")
    validate_users_and_roles(cursor)
    validate_profiles(cursor)
    validate_assets(cursor)
    validate_student_personalization(cursor)
    print("   [completed] identity dataset validation passed")
