"""
seed_categories.py
--------------------
Seed dữ liệu cho bảng `category` (danh mục khóa học).
"""

from snowflake_id import snowflake

CATEGORIES = [
    {"name": "Lập trình Web", "description": "HTML, CSS, JavaScript, React, Vue và các framework phát triển web hiện đại.", "status": "ACTIVE"},
    {"name": "Lập trình Mobile", "description": "Phát triển ứng dụng di động với Flutter, React Native, Swift và Kotlin.", "status": "ACTIVE"},
    {"name": "Khoa học dữ liệu & AI", "description": "Machine learning, deep learning, phân tích dữ liệu và trí tuệ nhân tạo.", "status": "ACTIVE"},
    {"name": "An toàn thông tin", "description": "Bảo mật hệ thống, kiểm thử xâm nhập và an ninh mạng.", "status": "ACTIVE"},
    {"name": "DevOps & Cloud", "description": "Docker, Kubernetes, CI/CD và các nền tảng đám mây AWS, Azure, GCP.", "status": "ACTIVE"},
    {"name": "Cơ sở dữ liệu", "description": "SQL, NoSQL, thiết kế và quản trị cơ sở dữ liệu.", "status": "ACTIVE"},
    {"name": "Tiếng Anh giao tiếp", "description": "Luyện nghe, nói tiếng Anh giao tiếp hàng ngày và công sở.", "status": "ACTIVE"},
    {"name": "Tiếng Anh luyện thi", "description": "Ôn luyện IELTS, TOEIC, TOEFL và các chứng chỉ quốc tế.", "status": "ACTIVE"},
    {"name": "Tiếng Nhật", "description": "Học tiếng Nhật từ cơ bản đến luyện thi JLPT.", "status": "ACTIVE"},
    {"name": "Tiếng Hàn", "description": "Học tiếng Hàn từ cơ bản đến luyện thi TOPIK.", "status": "ACTIVE"},
    {"name": "Tiếng Trung", "description": "Học tiếng Trung từ cơ bản đến luyện thi HSK.", "status": "ACTIVE"},
    {"name": "Toán học phổ thông", "description": "Toán lớp 6-12, luyện thi THPT Quốc gia và ôn tập nâng cao.", "status": "ACTIVE"},
    {"name": "Luyện thi đại học", "description": "Ôn thi tổng hợp các môn Toán, Lý, Hóa, Văn, Anh cho kỳ thi THPT.", "status": "ACTIVE"},
    {"name": "Kỹ năng mềm", "description": "Giao tiếp, thuyết trình, quản lý thời gian và làm việc nhóm.", "status": "ACTIVE"},
    {"name": "Marketing số", "description": "SEO, Facebook Ads, Google Ads, content marketing và social media.", "status": "ACTIVE"},
    {"name": "Kinh doanh & Khởi nghiệp", "description": "Quản trị kinh doanh, xây dựng mô hình khởi nghiệp và gọi vốn.", "status": "ACTIVE"},
    {"name": "Tài chính & Đầu tư", "description": "Quản lý tài chính cá nhân, chứng khoán, đầu tư và kế toán cơ bản.", "status": "ACTIVE"},
    {"name": "Thiết kế đồ họa", "description": "Photoshop, Illustrator, thiết kế ấn phẩm và nhận diện thương hiệu.", "status": "ACTIVE"},
    {"name": "Thiết kế UI/UX", "description": "Nguyên lý thiết kế trải nghiệm người dùng, Figma và prototyping.", "status": "ACTIVE"},
    {"name": "Dựng phim & Video", "description": "Premiere Pro, After Effects, dựng phim và sản xuất nội dung video.", "status": "ACTIVE"},
    {
        "name": "Lập trình Backend",
        "description": "Java, Spring Boot, .NET, Node.js, PHP, Go và phát triển API, hệ thống backend.",
        "status": "ACTIVE"
    },
    {
        "name": "Lập trình Frontend",
        "description": "HTML, CSS, JavaScript, TypeScript, React, Angular và Vue.js.",
        "status": "ACTIVE"
    },
    {
        "name": "Kỹ thuật phần mềm",
        "description": "Phân tích, thiết kế hệ thống, kiểm thử, kiến trúc phần mềm và quản lý dự án.",
        "status": "ACTIVE"
    },
    {
        "name": "Mạng máy tính",
        "description": "Mô hình TCP/IP, cấu hình mạng, CCNA, quản trị mạng và hạ tầng CNTT.",
        "status": "ACTIVE"
    },
    {
        "name": "Hệ điều hành",
        "description": "Linux, Windows Server, quản trị hệ điều hành và lập trình hệ thống.",
        "status": "ACTIVE"
    },
    {
        "name": "Toán cao cấp",
        "description": "Giải tích, đại số tuyến tính, phương trình vi phân và toán ứng dụng.",
        "status": "ACTIVE"
    },
    {
        "name": "Xác suất & Thống kê",
        "description": "Xác suất, thống kê, phân tích dữ liệu và ứng dụng trong khoa học dữ liệu.",
        "status": "ACTIVE"
    },
    {
        "name": "Vật lý",
        "description": "Cơ học, điện từ, quang học, vật lý hiện đại và các ứng dụng kỹ thuật.",
        "status": "ACTIVE"
    },
    {
        "name": "Hóa học",
        "description": "Hóa học vô cơ, hữu cơ, phân tích, hóa lý và ứng dụng trong công nghiệp.",
        "status": "ACTIVE"
    },
    {
        "name": "Sinh học",
        "description": "Sinh học phân tử, di truyền học, sinh học tế bào và công nghệ sinh học.",
        "status": "ACTIVE"
    }
]


def get_id_by_name(cursor, name: str):
    cursor.execute("SELECT id FROM category WHERE name = %s", (name,))
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Insert dữ liệu category nếu chưa tồn tại (idempotent theo `name`)."""
    print("→ Seeding categories...")
    for c in CATEGORIES:
        existing_id = get_id_by_name(cursor, c["name"])
        if existing_id:
            print(f"   [skip] category {c['name']} đã tồn tại (id={existing_id})")
            continue
        new_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO category (id, name, description, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            """,
            (new_id, c["name"], c["description"], c["status"]),
        )
        print(f"   [insert] category {c['name']} (id={new_id})")