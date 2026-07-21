"""
file_metadata.py
----------------------
Seed dữ liệu giả lập cho bảng `file_metadata` (~50 files).
- Cố định seed 100% (random.seed(42)).
- Mô phỏng file_key chuẩn MinIO (có đính kèm ID ngẫu nhiên không đổi).
- Idempotent theo `file_key`.
"""

import random
from datetime import datetime, timedelta
from faker import Faker
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
Faker.seed(42)
random.seed(42)
# -----------------------------------------

fake = Faker("vi_VN")

TOTAL_FILES = 50

# Cấu hình mapping giữa Enum và đặc tính của file cho logic
FILE_TYPE_CONFIGS = {
    "AVATAR": {
        "folder": "avatars",
        "extensions": [(".jpg", "image/jpeg"), (".png", "image/png")],
        "min_size": 50 * 1024,       # 50 KB
        "max_size": 2 * 1024 * 1024, # 2 MB
        "prefixes": ["avatar_user_", "profile_pic_", "photo_"]
    },
    "COURSE_MATERIAL": {
        "folder": "materials",
        "extensions": [
            (".pdf", "application/pdf"), 
            (".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            (".zip", "application/zip")
        ],
        "min_size": 1 * 1024 * 1024,  # 1 MB
        "max_size": 25 * 1024 * 1024, # 25 MB
        "prefixes": ["lecture_slide_", "syllabus_", "lab_guideline_", "chapter_"]
    },
    "ASSIGNMENT_SUBMISSION": {
        "folder": "submissions",
        "extensions": [
            (".pdf", "application/pdf"), 
            (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            (".zip", "application/zip")
        ],
        "min_size": 100 * 1024,      # 100 KB
        "max_size": 10 * 1024 * 1024, # 10 MB
        "prefixes": ["homework_", "assignment_", "final_project_", "report_"]
    },
    "CERTIFICATION": {
        "folder": "certificates",
        "extensions": [(".pdf", "application/pdf"), (".jpg", "image/jpeg")],
        "min_size": 200 * 1024,      # 200 KB
        "max_size": 5 * 1024 * 1024, # 5 MB
        "prefixes": ["cert_completion_", "degree_", "award_"]
    }
}

def generate_files_data():
    """Sinh danh sách 50 file metadata giả lập chuẩn xác."""
    files = []
    types_list = list(FILE_TYPE_CONFIGS.keys())
    
    for i in range(TOTAL_FILES):
        file_type = random.choice(types_list)
        config = FILE_TYPE_CONFIGS[file_type]
        
        ext, content_type = random.choice(config["extensions"])
        prefix = random.choice(config["prefixes"])
        
        original_name = f"{prefix}{fake.slug(fake.word())}_{i+1}{ext}"
        
        minio_uid = random.randint(100000000000000000, 999999999999999999)
        
        folder = config["folder"]
        file_key = f"{folder}/2026/07/{minio_uid}_{original_name}"
        
        file_size = random.randint(config["min_size"], config["max_size"])
        
        days_ago = random.randint(0, 60)
        created_at = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
        
        files.append({
            "original_name": original_name,
            "file_key": file_key,
            "file_type": file_type,
            "content_type": content_type,
            "file_size": file_size,
            "status": "ACTIVE",  # Default ACTIVE
            "created_at": created_at
        })
        
    return files

def get_id_by_file_key(cursor, file_key: str):
    """Kiểm tra xem file_key này đã tồn tại trong DB chưa."""
    cursor.execute("SELECT id FROM file_metadata WHERE file_key = %s", (file_key,))
    row = cursor.fetchone()
    return row["id"] if row else None

def seed(cursor):
    """Insert dữ liệu file_metadata nếu chưa tồn tại (idempotent theo `file_key`)."""
    print("→ Seeding file_metadata...")
    files_data = generate_files_data()
    
    for f in files_data:
        existing_id = get_id_by_file_key(cursor, f["file_key"])
        if existing_id:
            print(f"   [skip] File {f['original_name']} đã tồn tại (id={existing_id})")
            continue
            
        new_id = snowflake.next_id()
        
        # Insert đúng 9 cột theo đúng Entity Java
        cursor.execute(
            """
            INSERT INTO file_metadata (
                id, file_key, original_name, file_size, content_type, 
                file_type, status, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                new_id,
                f["file_key"],
                f["original_name"],
                f["file_size"],
                f["content_type"],
                f["file_type"],
                f["status"],
                f["created_at"],
                f["created_at"]
            )
        )
        print(f"   [insert] [{f['file_type']:<21}] {f['original_name']:<30} ({f['file_size'] // 1024} KB) (id={new_id})")