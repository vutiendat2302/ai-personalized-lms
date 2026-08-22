"""Master data văn bằng và chứng chỉ chuyên môn dùng cho hồ sơ nhân sự."""

from snowflake_id import snowflake


QUALIFICATIONS = [
    {"category": "Kỹ thuật phần mềm", "issuer": "Đại học Bách khoa Hà Nội", "title": "Kỹ sư Công nghệ Thông tin", "type": "ENGINEER", "duration": "5 năm"},
    {"category": "Khoa học dữ liệu & AI", "issuer": "Đại học Công nghệ - ĐHQGHN", "title": "Cử nhân Khoa học Máy tính", "type": "BACHELORS", "duration": "4 năm"},
    {"category": "Khoa học dữ liệu & AI", "issuer": "Đại học Khoa học Tự nhiên - ĐHQG-HCM", "title": "Cử nhân Trí tuệ Nhân tạo", "type": "BACHELORS", "duration": "4 năm"},
    {"category": "Khoa học dữ liệu & AI", "issuer": "Đại học Bách khoa Hà Nội", "title": "Thạc sĩ Khoa học Dữ liệu", "type": "MASTERS", "duration": "2 năm"},
    {"category": "Kỹ thuật phần mềm", "issuer": "Đại học Công nghệ - ĐHQGHN", "title": "Thạc sĩ Kỹ thuật Phần mềm", "type": "MASTERS", "duration": "2 năm"},
    {"category": "Khoa học dữ liệu & AI", "issuer": "Đại học Quốc gia Hà Nội", "title": "Tiến sĩ Khoa học Máy tính", "type": "DOCTORATE", "duration": "3-4 năm"},
    {"category": "Thiết kế UI/UX", "issuer": "Đại học Mỹ thuật Công nghiệp", "title": "Cử nhân Thiết kế Đồ họa", "type": "BACHELORS", "duration": "4 năm"},
    {"category": "Marketing số", "issuer": "Đại học Kinh tế Quốc dân", "title": "Cử nhân Marketing", "type": "BACHELORS", "duration": "4 năm"},
    {"category": "Kinh doanh & Khởi nghiệp", "issuer": "Đại học Ngoại thương", "title": "Thạc sĩ Quản trị Kinh doanh", "type": "MASTERS", "duration": "1.5-2 năm"},
    {"category": "Tiếng Anh luyện thi", "issuer": "Đại học Hà Nội", "title": "Cử nhân Ngôn ngữ Anh", "type": "BACHELORS", "duration": "4 năm"},
    {"category": "Tài chính & Đầu tư", "issuer": "Đại học Kinh tế TP.HCM", "title": "Cử nhân Tài chính - Ngân hàng", "type": "BACHELORS", "duration": "4 năm"},
    {"category": "Quản trị nhân sự", "issuer": "Đại học Kinh tế Quốc dân", "title": "Cử nhân Quản trị Nhân lực", "type": "BACHELORS", "duration": "4 năm"},
    {"category": "DevOps & Cloud", "issuer": "Amazon Web Services", "title": "AWS Certified Solutions Architect - Associate", "type": "CERTIFICATE", "duration": "Hiệu lực 3 năm"},
    {"category": "DevOps & Cloud", "issuer": "Microsoft", "title": "Microsoft Certified: Azure Administrator Associate", "type": "CERTIFICATE", "duration": "Gia hạn hằng năm"},
    {"category": "DevOps & Cloud", "issuer": "Google Cloud", "title": "Professional Cloud Architect", "type": "CERTIFICATE", "duration": "Hiệu lực 2 năm"},
    {"category": "DevOps & Cloud", "issuer": "Cloud Native Computing Foundation", "title": "Certified Kubernetes Administrator (CKA)", "type": "CERTIFICATE", "duration": "Hiệu lực 2 năm"},
    {"category": "Quản trị dự án", "issuer": "Project Management Institute", "title": "Project Management Professional (PMP)", "type": "CERTIFICATE", "duration": "Chu kỳ duy trì 3 năm"},
    {"category": "Quản trị dự án", "issuer": "Scrum.org", "title": "Professional Scrum Master I (PSM I)", "type": "CERTIFICATE", "duration": "Không thời hạn"},
    {"category": "An toàn thông tin", "issuer": "ISC2", "title": "Certified Information Systems Security Professional (CISSP)", "type": "CERTIFICATE", "duration": "Chu kỳ duy trì 3 năm"},
    {"category": "An toàn thông tin", "issuer": "CompTIA", "title": "CompTIA Security+", "type": "CERTIFICATE", "duration": "Hiệu lực 3 năm"},
    {"category": "Tiếng Anh luyện thi", "issuer": "IELTS Partners", "title": "IELTS Academic 8.0", "type": "CERTIFICATE", "duration": "Khuyến nghị 2 năm"},
    {"category": "Tiếng Anh luyện thi", "issuer": "ETS", "title": "TOEIC Listening & Reading 900+", "type": "CERTIFICATE", "duration": "Khuyến nghị 2 năm"},
    {"category": "Tiếng Nhật", "issuer": "Japan Foundation / JEES", "title": "Japanese-Language Proficiency Test N1", "type": "CERTIFICATE", "duration": "Không thời hạn"},
    {"category": "Thiết kế UI/UX", "issuer": "Google", "title": "Google UX Design Professional Certificate", "type": "CERTIFICATE", "duration": "Chứng chỉ nghề nghiệp"},
]


def get_category_map(cursor):
    """Tải category name -> ID để gán qualification xác định, không random."""
    cursor.execute("SELECT id, name FROM category")
    return {row["name"]: row["id"] for row in cursor.fetchall()}


def get_degree_id(cursor, issuer, title):
    """Tìm qualification theo tổ chức cấp và tên văn bằng."""
    cursor.execute(
        "SELECT id FROM degree WHERE university_name=%s AND title=%s LIMIT 1",
        (issuer, title),
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def validate_catalog():
    """Kiểm tra không trùng qualification và mọi loại đều thuộc enum mở rộng."""
    keys = [(item["issuer"], item["title"]) for item in QUALIFICATIONS]
    allowed_types = {"ASSOCIATE", "BACHELORS", "ENGINEER", "MASTERS", "DOCTORATE", "CERTIFICATE"}
    if len(keys) != len(set(keys)):
        raise ValueError("Qualification bị trùng trong master catalog.")
    if any(item["type"] not in allowed_types for item in QUALIFICATIONS):
        raise ValueError("Qualification dùng type chưa được hỗ trợ.")


def seed(cursor):
    """Đồng bộ qualification theo natural key với category rõ ràng và không dùng ảnh giả."""
    validate_catalog()
    print("→ Seeding qualifications...")
    categories = get_category_map(cursor)
    for item in QUALIFICATIONS:
        category_id = categories.get(item["category"])
        if category_id is None:
            raise ValueError(f"Không tìm thấy category cho qualification: {item['category']}")
        existing_id = get_degree_id(cursor, item["issuer"], item["title"])
        values = (category_id, item["issuer"], item["title"], item["type"], item["duration"])
        if existing_id:
            cursor.execute(
                """UPDATE degree SET category_id=%s, university_name=%s, title=%s, type=%s,
                   duration=%s, university_logo=NULL, image=NULL, status='ACTIVE', updated_at=NOW()
                   WHERE id=%s""",
                (*values, existing_id),
            )
            continue
        cursor.execute(
            """INSERT INTO degree
               (id, category_id, university_name, university_logo, title, type, duration,
                image, status, created_at, updated_at)
               VALUES (%s, %s, %s, NULL, %s, %s, %s, NULL, 'ACTIVE', NOW(), NOW())""",
            (snowflake.next_id(), *values),
        )
    print(f"   [completed] qualifications synchronized: {len(QUALIFICATIONS)}")
