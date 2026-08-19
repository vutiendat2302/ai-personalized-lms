"""Catalog định danh cố định cho bộ dữ liệu báo cáo User & Profile năm 2026."""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, timedelta


DATASET_CODE = "FINAL_REPORT_2026"
REFERENCE_DATE = date(2026, 8, 15)
COMMON_PASSWORD_HASH = "$2a$10$oUoRbyMti8EO2Rd4Rz84welApeqtbJ7uthtb1nXzX9AS5jlBjkA7u"

ROLE_LAYOUT = (
    ("ADMIN", "admin", 1),
    ("HR", "hr", 5),
    ("SUPPORT", "support", 5),
    ("TEACHER", "teacher", 26),
    ("TA", "ta", 13),
    ("STUDENT", "student", 50),
)

SURNAMES = ("Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ")
MIDDLE_NAMES = ("Minh", "Thanh", "Ngọc", "Quang", "Khánh")
MALE_GIVEN_NAMES = ("An", "Bảo", "Dũng", "Hải", "Huy", "Khoa", "Long", "Nam", "Phong", "Tuấn")
FEMALE_GIVEN_NAMES = ("Anh", "Chi", "Giang", "Hà", "Lan", "Linh", "Mai", "Ngân", "Thảo", "Vy")

MINOR_SCHOOLS = (
    "THCS Giảng Võ",
    "THCS Nguyễn Trường Tộ",
    "THPT Chu Văn An",
    "THPT Phan Đình Phùng",
    "THPT Chuyên Hà Nội - Amsterdam",
    "THPT Chuyên Sư phạm",
)
ADULT_SCHOOLS = (
    "Đại học Bách khoa Hà Nội",
    "Đại học Công nghệ - ĐHQGHN",
    "Học viện Công nghệ Bưu chính Viễn thông",
    "Đại học Kinh tế Quốc dân",
    "Đại học Ngoại thương",
    "Đại học FPT",
    "Đại học Khoa học Tự nhiên - ĐHQGHN",
    "Người đi làm",
)

INTEREST_TRACKS = (
    ("IT_PROGRAMMING", "PYTHON", "JAVA_SPRING", "DATABASE_SYSTEM"),
    ("WEB_DEVELOPMENT", "JAVASCRIPT_TYPESCRIPT", "REACT", "UI_UX_DESIGN"),
    ("DATA_SCIENCE", "DATA_ANALYTICS", "SQL_DATA", "MACHINE_LEARNING"),
    ("ARTIFICIAL_INTELLIGENCE", "GENERATIVE_AI", "PYTHON", "MACHINE_LEARNING"),
    ("ENGLISH_LANGUAGE", "IELTS", "PUBLIC_SPEAKING", "CAREER_ORIENTATION"),
    ("PROJECT_MANAGEMENT", "SOFT_SKILLS", "LEADERSHIP", "BUSINESS_ADMIN"),
    ("MATHEMATICS", "PHYSICS", "CHEMISTRY", "ENGLISH_LANGUAGE"),
    ("CYBER_SECURITY", "CLOUD_COMPUTING", "DOCKER_KUBERNETES", "SYSTEM_DESIGN"),
)


def stable_token(namespace: str, value: str, length: int = 6) -> str:
    """Sinh chuỗi chữ-số ổn định để tạo code mà không phụ thuộc random toàn cục."""
    digest = hashlib.sha256(f"{namespace}:{value}".encode("utf-8")).hexdigest().upper()
    return digest[:length]


def generated_code(prefix: str, username: str) -> str:
    """Sinh mã EP/ST cùng định dạng PREFIX-yyMM-XXXXXX của backend."""
    return f"{prefix}-{REFERENCE_DATE:%y%m}-{stable_token(prefix, username)}"


def full_name(index: int) -> tuple[str, int]:
    """Sinh họ tên Việt Nam duy nhất và mã giới tính ổn định theo chỉ số."""
    gender = index % 2
    given_names = MALE_GIVEN_NAMES if gender == 0 else FEMALE_GIVEN_NAMES
    surname = SURNAMES[index % len(SURNAMES)]
    middle = MIDDLE_NAMES[(index // len(SURNAMES)) % len(MIDDLE_NAMES)]
    given = given_names[(index * 3 + index // 10) % len(given_names)]
    return f"{surname} {middle} {given}", gender


def username_for(role: str, ordinal: int) -> str:
    """Sinh username dễ nhớ và cố định theo role trong bộ dữ liệu báo cáo."""
    if role == "ADMIN":
        return "admin.report"
    return f"{role.lower()}{ordinal:02d}"


def birth_date_for(role: str, ordinal: int) -> date:
    """Sinh ngày sinh nhất quán với quy tắc vị thành niên của hồ sơ học viên."""
    if role == "STUDENT" and ordinal <= 12:
        return date(2009 + (ordinal % 3), 1 + (ordinal * 2) % 12, 2 + (ordinal * 3) % 26)
    if role == "STUDENT":
        return date(1994 + (ordinal % 13), 1 + (ordinal * 5) % 12, 2 + (ordinal * 7) % 26)
    return date(1981 + (ordinal % 20), 1 + (ordinal * 3) % 12, 2 + (ordinal * 5) % 26)


def build_people() -> tuple[dict, ...]:
    """Tạo catalog đúng 50 nhân viên và 50 học viên theo phân bố role đã chốt."""
    people = []
    index = 0
    for role, _, count in ROLE_LAYOUT:
        for ordinal in range(1, count + 1):
            username = username_for(role, ordinal)
            name, gender = full_name(index)
            birth_date = birth_date_for(role, ordinal)
            created_at = datetime(2024, 1, 8, 8, 0) + timedelta(days=index * 3)
            attributes = json.dumps(
                {
                    "dataset": DATASET_CODE,
                    "locale": "vi-VN",
                    "timezone": "Asia/Bangkok",
                    "notificationsEnabled": True,
                },
                ensure_ascii=False,
                separators=(",", ":"),
            )
            people.append(
                {
                    "role": role,
                    "ordinal": ordinal,
                    "username": username,
                    "email": f"{username}@demo.ailms.vn",
                    "password_hash": COMMON_PASSWORD_HASH,
                    "full_name": name,
                    "phone": f"09{index + 1:08d}",
                    "gender": gender,
                    "date_of_birth": datetime.combine(birth_date, datetime.min.time()),
                    "attributes": attributes,
                    "status": "ACTIVE",
                    "created_at": created_at,
                    "last_login_at": datetime(2026, 8, 1, 7, 30) + timedelta(hours=index % 120),
                }
            )
            index += 1

    assert len(people) == 100
    assert sum(person["role"] != "STUDENT" for person in people) == 50
    assert sum(person["role"] == "STUDENT" for person in people) == 50
    return tuple(people)


PEOPLE = build_people()
PEOPLE_BY_USERNAME = {person["username"]: person for person in PEOPLE}


def employee_profile(person: dict) -> dict:
    """Suy ra hồ sơ nhân sự phù hợp với role và quy tắc backend."""
    role = person["role"]
    ordinal = person["ordinal"]
    start_date = datetime(2022 + ordinal % 3, 1 + ordinal % 12, 1 + ordinal % 20, 8, 0)
    if role == "TA" and ordinal >= 12:
        start_date = datetime(2026, 7, ordinal - 10, 8, 0)
    department_by_role = {
        "ADMIN": "IT",
        "HR": "HR",
        "SUPPORT": "SUPPORT",
        "TEACHER": ("ACADEMIC", "CONTENT", "QUALITY")[(ordinal - 1) % 3],
        "TA": ("ACADEMIC", "OPERATIONS")[(ordinal - 1) % 2],
    }
    position_by_role = {
        "ADMIN": "Quản trị hệ thống",
        "HR": "Chuyên viên Nhân sự" if ordinal < 5 else "Trưởng nhóm Nhân sự",
        "SUPPORT": "Chuyên viên Hỗ trợ Học viên",
        "TEACHER": "Giảng viên chính" if ordinal <= 8 else "Giảng viên",
        "TA": "Trợ giảng",
    }
    status = "ON_LEAVE" if role == "TEACHER" and ordinal == 26 else "ACTIVE"
    if role == "TA" and ordinal >= 12:
        status = "PROBATION"
    return {
        "employee_code": generated_code("EP", person["username"]),
        "department_code": department_by_role[role],
        "position": position_by_role[role],
        "bio": _employee_bio(person),
        "employment_type": "PART_TIME" if role == "TA" else "FULL_TIME",
        "start_date": start_date,
        "end_date": None,
        "address": f"Số {12 + ordinal}, phường Dịch Vọng, quận Cầu Giấy, Hà Nội",
        "status": status,
    }


def _employee_bio(person: dict) -> str:
    """Tạo giới thiệu nghề nghiệp ngắn gọn theo vai trò nhân sự."""
    role_text = {
        "ADMIN": "quản trị và vận hành nền tảng học tập số",
        "HR": "quản trị nhân sự, hợp đồng và vận hành đào tạo",
        "SUPPORT": "tư vấn, hỗ trợ và đồng hành cùng học viên",
        "TEACHER": "giảng dạy theo định hướng thực hành và cá nhân hóa lộ trình",
        "TA": "hỗ trợ lớp học, giải đáp bài tập và theo dõi tiến độ",
    }[person["role"]]
    return f"{person['full_name']} có kinh nghiệm {role_text}; ưu tiên phản hồi rõ ràng, đúng hạn và dựa trên dữ liệu."


def student_profile(person: dict) -> dict:
    """Suy ra hồ sơ học viên, trường học và mục tiêu phù hợp với độ tuổi."""
    ordinal = person["ordinal"]
    is_minor = person["date_of_birth"].date() > date(2008, 8, 15)
    track = INTEREST_TRACKS[(ordinal - 1) % len(INTEREST_TRACKS)]
    if is_minor:
        education_level = "THCS" if person["date_of_birth"].year >= 2011 else "THPT"
        school_name = MINOR_SCHOOLS[(ordinal - 1) % len(MINOR_SCHOOLS)]
        goal = "Củng cố kiến thức nền tảng, cải thiện kết quả học tập và chuẩn bị tốt cho kỳ thi chuyển cấp."
    else:
        education_level = ("Đại học", "Người đi làm", "Sau đại học")[(ordinal - 13) % 3]
        school_name = (
            "Đang làm việc tại doanh nghiệp công nghệ"
            if education_level == "Người đi làm"
            else ADULT_SCHOOLS[(ordinal - 13) % (len(ADULT_SCHOOLS) - 1)]
        )
        goal = "Hoàn thành lộ trình học có hệ thống, xây dựng sản phẩm thực tế và nâng cao năng lực nghề nghiệp."
    return {
        "student_code": generated_code("ST", person["username"]),
        "education_level": education_level,
        "description": "Học viên chủ động, ưu tiên bài tập thực hành và cần lộ trình có mốc đánh giá rõ ràng.",
        "goal": goal,
        "school_name": school_name,
        "has_goal": True,
        "is_minor": is_minor,
        "interest_codes": track,
    }


def dataset_usernames(role: str | None = None) -> tuple[str, ...]:
    """Trả danh sách username thuộc dataset, có thể lọc theo role."""
    return tuple(person["username"] for person in PEOPLE if role is None or person["role"] == role)
