"""
seed_interest.py
------------------
Seed dữ liệu cho bảng `interest` (danh mục sở thích / lĩnh vực học viên
muốn tìm hiểu, phát triển) — bao trùm từ cấp THPT đến Đại học, ưu tiên
các lĩnh vực có thể thiết kế nội dung học online được.

status: Byte, 1 = Active, 0 = Inactive.
"""

from snowflake_id import snowflake

# (code, name, description, status)
INTERESTS = [
    # ===================== CÔNG NGHỆ THÔNG TIN =====================
    ("IT_PROGRAMMING", "Lập trình máy tính",
     "Nền tảng lập trình, cấu trúc dữ liệu và giải thuật, các ngôn ngữ phổ biến (Python, Java, C++...).", 1),
    ("WEB_DEVELOPMENT", "Phát triển Web",
     "Xây dựng website và ứng dụng web với HTML/CSS/JavaScript, frontend và backend framework.", 1),
    ("MOBILE_DEVELOPMENT", "Phát triển ứng dụng di động",
     "Xây dựng ứng dụng cho Android/iOS với Flutter, React Native, Swift, Kotlin.", 1),
    ("DATA_SCIENCE", "Khoa học dữ liệu",
     "Phân tích, xử lý và trực quan hóa dữ liệu, thống kê ứng dụng.", 1),
    ("ARTIFICIAL_INTELLIGENCE", "Trí tuệ nhân tạo & Machine Learning",
     "Học máy, học sâu, xử lý ngôn ngữ tự nhiên và các ứng dụng AI thực tế.", 1),
    ("CYBER_SECURITY", "An toàn thông tin",
     "Bảo mật hệ thống, kiểm thử xâm nhập và an ninh mạng cơ bản đến nâng cao.", 1),
    ("DATABASE_SYSTEM", "Cơ sở dữ liệu & Hệ thống",
     "Thiết kế, quản trị cơ sở dữ liệu quan hệ và NoSQL.", 1),
    ("CLOUD_COMPUTING", "Điện toán đám mây",
     "Triển khai và vận hành hệ thống trên AWS, Azure, Google Cloud.", 1),
    ("GAME_DEVELOPMENT", "Thiết kế và lập trình game",
     "Xây dựng trò chơi điện tử với Unity, Unreal Engine, thiết kế gameplay.", 1),

    # ===================== THIẾT KẾ - SÁNG TẠO =====================
    ("GRAPHIC_DESIGN", "Thiết kế đồ họa",
     "Thiết kế ấn phẩm, nhận diện thương hiệu với Photoshop, Illustrator.", 1),
    ("UI_UX_DESIGN", "Thiết kế UI/UX",
     "Thiết kế trải nghiệm và giao diện người dùng cho web, ứng dụng.", 1),
    ("VIDEO_EDITING", "Dựng phim & Biên tập video",
     "Kỹ thuật dựng phim, hậu kỳ video với Premiere Pro, DaVinci Resolve.", 1),
    ("MOTION_GRAPHIC", "Motion Graphics & Hoạt hình 2D/3D",
     "Thiết kế hoạt hình chuyển động, hiệu ứng hình ảnh với After Effects, Blender.", 1),
    ("PHOTOGRAPHY", "Nhiếp ảnh",
     "Kỹ thuật chụp ảnh, xử lý hậu kỳ và nghệ thuật thị giác.", 1),
    ("ARCHITECTURE_DESIGN", "Thiết kế kiến trúc & Nội thất",
     "Thiết kế bản vẽ kiến trúc, nội thất với AutoCAD, SketchUp, Revit.", 1),

    # ===================== KINH DOANH - QUẢN TRỊ =====================
    ("BUSINESS_ADMIN", "Quản trị kinh doanh",
     "Kiến thức nền tảng về quản trị doanh nghiệp, vận hành và chiến lược.", 1),
    ("DIGITAL_MARKETING", "Marketing số",
     "SEO, quảng cáo Facebook/Google Ads, content marketing, social media.", 1),
    ("ENTREPRENEURSHIP", "Khởi nghiệp & Startup",
     "Xây dựng mô hình kinh doanh, gọi vốn và phát triển startup.", 1),
    ("FINANCE_INVESTMENT", "Tài chính & Đầu tư",
     "Kiến thức tài chính cá nhân, chứng khoán, đầu tư và quản lý rủi ro.", 1),
    ("ACCOUNTING", "Kế toán - Kiểm toán",
     "Nguyên lý kế toán, báo cáo tài chính và kiểm toán doanh nghiệp.", 1),
    ("HUMAN_RESOURCES", "Quản trị nhân sự",
     "Tuyển dụng, đào tạo, quản lý hiệu suất và văn hóa doanh nghiệp.", 1),
    ("PROJECT_MANAGEMENT", "Quản lý dự án",
     "Phương pháp quản lý dự án Agile, Scrum, PMP.", 1),
    ("ECOMMERCE", "Thương mại điện tử",
     "Vận hành gian hàng online, sàn TMĐT, bán hàng đa kênh.", 1),

    # ===================== NGOẠI NGỮ =====================
    ("ENGLISH_LANGUAGE", "Tiếng Anh",
     "Luyện kỹ năng nghe, nói, đọc, viết và luyện thi IELTS/TOEIC.", 1),
    ("JAPANESE_LANGUAGE", "Tiếng Nhật",
     "Học tiếng Nhật giao tiếp và luyện thi JLPT.", 1),
    ("KOREAN_LANGUAGE", "Tiếng Hàn",
     "Học tiếng Hàn giao tiếp và luyện thi TOPIK.", 1),
    ("CHINESE_LANGUAGE", "Tiếng Trung",
     "Học tiếng Trung giao tiếp và luyện thi HSK.", 1),

    # ===================== KHOA HỌC TỰ NHIÊN (THPT & ĐẠI CƯƠNG) =====================
    ("MATHEMATICS", "Toán học",
     "Toán phổ thông, toán cao cấp, giải tích, đại số tuyến tính.", 1),
    ("PHYSICS", "Vật lý",
     "Vật lý phổ thông và đại cương, cơ học, điện từ học.", 1),
    ("CHEMISTRY", "Hóa học",
     "Hóa học phổ thông và đại cương, hóa hữu cơ, hóa vô cơ.", 1),
    ("BIOLOGY", "Sinh học",
     "Sinh học phổ thông, di truyền học, sinh học phân tử.", 1),

    # ===================== KHOA HỌC XÃ HỘI - NHÂN VĂN =====================
    ("LITERATURE", "Ngữ văn",
     "Văn học Việt Nam và thế giới, kỹ năng viết luận, cảm thụ văn học.", 1),
    ("HISTORY", "Lịch sử",
     "Lịch sử Việt Nam và thế giới.", 1),
    ("GEOGRAPHY", "Địa lý",
     "Địa lý tự nhiên và kinh tế - xã hội.", 1),
    ("PSYCHOLOGY", "Tâm lý học",
     "Tâm lý học đại cương, tâm lý học ứng dụng trong đời sống và công việc.", 1),
    ("PHILOSOPHY", "Triết học & Tư duy phản biện",
     "Rèn luyện tư duy logic, phản biện và các trường phái triết học.", 1),
    ("LAW", "Pháp luật đại cương",
     "Kiến thức pháp luật cơ bản, luật doanh nghiệp, luật dân sự.", 1),

    # ===================== KỸ NĂNG MỀM & PHÁT TRIỂN BẢN THÂN =====================
    ("PUBLIC_SPEAKING", "Kỹ năng thuyết trình & Giao tiếp",
     "Rèn luyện kỹ năng nói trước đám đông, giao tiếp hiệu quả.", 1),
    ("SOFT_SKILLS", "Kỹ năng mềm tổng hợp",
     "Làm việc nhóm, quản lý thời gian, tư duy sáng tạo, giải quyết vấn đề.", 1),
    ("CAREER_ORIENTATION", "Định hướng nghề nghiệp",
     "Tư vấn hướng nghiệp, kỹ năng phỏng vấn và xây dựng CV.", 1),
    ("LEADERSHIP", "Kỹ năng lãnh đạo",
     "Phát triển năng lực lãnh đạo, quản lý đội nhóm.", 1),

    # ===================== NGHỆ THUẬT - ĐỜI SỐNG =====================
    ("MUSIC", "Âm nhạc",
     "Lý thuyết âm nhạc, học nhạc cụ, thanh nhạc cơ bản.", 1),
    ("FINE_ARTS", "Mỹ thuật & Hội họa",
     "Vẽ tay, hội họa cơ bản đến nâng cao.", 1),
    ("CREATIVE_WRITING", "Viết sáng tạo & Content",
     "Kỹ năng viết nội dung, viết truyện, biên tập nội dung số.", 1),
    ("COOKING", "Ẩm thực & Nấu ăn",
     "Kỹ năng nấu ăn, pha chế và văn hóa ẩm thực.", 1),

    # ===================== SỨC KHỎE - THỂ CHẤT =====================
    ("HEALTH_FITNESS", "Sức khỏe & Thể hình",
     "Kiến thức dinh dưỡng, luyện tập thể thao và lối sống lành mạnh.", 1),
    ("YOGA_MEDITATION", "Yoga & Thiền định",
     "Rèn luyện thể chất và tinh thần qua yoga, thiền.", 1),

    # ===================== KỸ THUẬT - CÔNG NGHỆ ỨNG DỤNG =====================
    ("ELECTRONICS", "Điện - Điện tử",
     "Kiến thức mạch điện, điện tử cơ bản và ứng dụng IoT.", 1),
    ("MECHANICAL_ENGINEERING", "Cơ khí - Chế tạo",
     "Nguyên lý cơ khí, thiết kế và chế tạo máy.", 1),
    ("ROBOTICS_IOT", "Robotics & IoT",
     "Lập trình robot, hệ thống nhúng và Internet vạn vật.", 1),

    # ===================== THẺ CÔNG NGHỆ & CHỨNG CHỈ CHUYÊN SÂU =====================
    ("PYTHON", "Python", "Lập trình Python cho backend, tự động hóa, dữ liệu và trí tuệ nhân tạo.", 1),
    ("JAVA_SPRING", "Java & Spring Boot", "Phát triển backend doanh nghiệp với Java, Spring Boot, JPA và REST API.", 1),
    ("JAVASCRIPT_TYPESCRIPT", "JavaScript & TypeScript", "Phát triển ứng dụng web hiện đại với JavaScript và TypeScript.", 1),
    ("REACT", "React", "Xây dựng giao diện web với React, quản lý trạng thái và hệ sinh thái frontend.", 1),
    ("NODEJS", "Node.js", "Phát triển dịch vụ backend và API với Node.js.", 1),
    ("DOTNET", ".NET", "Phát triển ứng dụng và dịch vụ web với C# và ASP.NET Core.", 1),
    ("FLUTTER", "Flutter", "Phát triển ứng dụng đa nền tảng bằng Dart và Flutter.", 1),
    ("SQL_DATA", "SQL & Mô hình dữ liệu", "Truy vấn SQL, thiết kế dữ liệu quan hệ và tối ưu cơ sở dữ liệu.", 1),
    ("DOCKER_KUBERNETES", "Docker & Kubernetes", "Đóng gói, triển khai và điều phối ứng dụng bằng container.", 1),
    ("AWS_CLOUD", "AWS Cloud", "Kiến trúc và vận hành hệ thống trên Amazon Web Services.", 1),
    ("MACHINE_LEARNING", "Machine Learning", "Xây dựng, đánh giá và triển khai mô hình học máy.", 1),
    ("GENERATIVE_AI", "Generative AI", "Ứng dụng mô hình ngôn ngữ lớn, RAG, prompt engineering và AI agents.", 1),
    ("DATA_ANALYTICS", "Phân tích dữ liệu", "Làm sạch, trực quan hóa và phân tích dữ liệu phục vụ quyết định.", 1),
    ("SOFTWARE_TESTING", "Kiểm thử phần mềm", "Kiểm thử chức năng, tự động hóa kiểm thử và đảm bảo chất lượng phần mềm.", 1),
    ("SYSTEM_DESIGN", "Thiết kế hệ thống", "Kiến trúc phần mềm, khả năng mở rộng và thiết kế hệ thống phân tán.", 1),
    ("FIGMA", "Figma", "Thiết kế giao diện, prototype và design system bằng Figma.", 1),
    ("IELTS", "IELTS", "Phát triển bốn kỹ năng và chiến lược luyện thi IELTS.", 1),
    ("TOEIC", "TOEIC", "Luyện nghe, đọc và kỹ năng làm bài TOEIC.", 1),
    ("JLPT", "JLPT", "Luyện tiếng Nhật theo các cấp độ JLPT N5 đến N1.", 1),
]


def get_id_by_code(cursor, code: str):
    cursor.execute("SELECT id FROM interest WHERE code = %s", (code,))
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Đồng bộ interest theo code và cập nhật metadata của bản ghi hiện hữu."""
    print("→ Seeding interest...")
    for code, name, description, status in INTERESTS:
        existing_id = get_id_by_code(cursor, code)
        if existing_id:
            cursor.execute(
                "UPDATE interest SET name=%s, description=%s, status=%s, updated_at=NOW() WHERE id=%s",
                (name, description, status, existing_id),
            )
            continue
        new_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO interest (id, code, name, description, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (new_id, code, name, description, status),
        )
        print(f"   [insert] interest {code} (id={new_id})")
    print(f"   [completed] interests synchronized: {len(INTERESTS)}")
