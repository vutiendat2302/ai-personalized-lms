"""
/**
 * Seed dữ liệu chuẩn cho bảng `file_metadata` (~50 files).
 * - Tự động query ID thật từ các bảng user, employee_contract, lesson_resource, submission, assignment, quiz.
 * - Đã thêm cột created_by ngẫu nhiên lấy từ bảng `user` để hiển thị Người tải lên.
 */
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

# Cấu hình chuẩn tên Bảng DB và tên Entity Java
FILE_USAGE_CONFIGS = {
    "AVATAR": {
        "file_type": "IMAGE",
        "folder": "avatars",
        "extensions": [(".jpg", "image/jpeg"), (".png", "image/png")],
        "min_size": 50 * 1024,
        "max_size": 2 * 1024 * 1024,
        "prefixes": ["avatar_user_", "profile_pic_", "photo_"],
        "ref_table": "user",       # Tên bảng thực tế trong DB
        "ref_type": "User"         # Tên Entity theo chuẩn Java
    },
    "LESSON_RESOURCE": {
        "file_type": "DOCUMENT",
        "folder": "materials",
        "extensions": [
            (".pdf", "application/pdf"), 
            (".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            (".zip", "application/zip")
        ],
        "min_size": 1 * 1024 * 1024,
        "max_size": 25 * 1024 * 1024,
        "prefixes": ["lecture_slide_", "syllabus_", "lab_guideline_", "chapter_"],
        "ref_table": "lesson_resource",
        "ref_type": "LessonResource"
    },
    "ASSIGNMENT_SUBMISSION": {
        "file_type": "DOCUMENT",
        "folder": "submissions",
        "extensions": [
            (".pdf", "application/pdf"), 
            (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        ],
        "min_size": 100 * 1024,
        "max_size": 10 * 1024 * 1024,
        "prefixes": ["homework_", "assignment_", "final_project_"],
        "ref_table": "submission",    # Tên bảng thực tế trong DB
        "ref_type": "Submission font" # Tên Entity Java
    },
    "CONTRACT": {
        "file_type": "DOCUMENT",
        "folder": "contracts",
        "extensions": [(".pdf", "application/pdf")],
        "min_size": 200 * 1024,
        "max_size": 5 * 1024 * 1024,
        "prefixes": ["contract_employee_", "nda_"],
        "ref_table": "employee_contract",
        "ref_type": "EmployeeContract"
    },
    "ASSIGNMENT": {
        "file_type": "DOCUMENT",
        "folder": "assignments",
        "extensions": [(".pdf", "application/pdf"), (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")],
        "min_size": 150 * 1024,
        "max_size": 8 * 1024 * 1024,
        "prefixes": ["quiz_prompt_", "assignment_attachment_"],
        "ref_table": "assignment",
        "ref_type": "Assignment"
    },
    "QUIZ_ATTACHMENT": {
        "file_type": "IMAGE",
        "folder": "quizzes",
        "extensions": [(".png", "image/png"), (".jpg", "image/jpeg")],
        "min_size": 80 * 1024,
        "max_size": 3 * 1024 * 1024,
        "prefixes": ["diagram_", "quiz_img_"],
        "ref_table": "quiz",
        "ref_type": "Quiz"
    }
}

def get_valid_ids_from_table(cursor, table_name):
    """Query lấy toàn bộ ID thật từ bảng để đảm bảo không bịa ID."""
    try:
        cursor.execute(f"SELECT id FROM {table_name}")
        rows = cursor.fetchall()
        if rows:
            if isinstance(rows[0], dict):
                return [row["id"] for row in rows]
            else:
                return [row[0] for row in rows]
        return []
    except Exception as e:
        print(f"   [Cảnh báo] Không thể lấy ID từ bảng {table_name}: {e}")
        return []

def generate_files_data(cursor):
    """Sinh danh sách file metadata dựa trên ID thật từ DB."""
    
    # 1. Cache các ID có thật từ các bảng tham chiếu
    valid_ids_cache = {}
    for usage_type, config in FILE_USAGE_CONFIGS.items():
        if config["ref_table"]:
            valid_ids_cache[usage_type] = get_valid_ids_from_table(cursor, config["ref_table"])

    # 2. Lấy danh sách User ID có thật làm người tải lên (created_by)
    user_ids = get_valid_ids_from_table(cursor, "user")

    files = []
    usage_types_list = list(FILE_USAGE_CONFIGS.keys())
    
    for i in range(TOTAL_FILES):
        usage_type = random.choice(usage_types_list)
        config = FILE_USAGE_CONFIGS[usage_type]
        
        # Gán ID tham chiếu thật (hoặc NULL 20% tỉ lệ để tạo file mồ côi ngẫu nhiên)
        available_ids = valid_ids_cache.get(usage_type, [])
        is_orphaned_choice = (random.random() < 0.2) or not available_ids
        
        reference_entity_id = None if is_orphaned_choice else random.choice(available_ids)
        orphaned_detected_at = datetime.now() if reference_entity_id is None else None

        # Người tải lên ngẫu nhiên từ bảng user
        created_by = random.choice(user_ids) if user_ids else None

        ext, content_type = random.choice(config["extensions"])
        prefix = random.choice(config["prefixes"])
        original_name = f"{prefix}{fake.slug(fake.word())}_{i+1}{ext}"
        
        minio_uid = random.randint(100000000000000000, 999999999999999999)
        file_key = f"{config['folder']}/2026/07/{minio_uid}_{original_name}"
        file_size = random.randint(config["min_size"], config["max_size"])
        
        days_ago = random.randint(0, 60)
        created_at = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
        
        files.append({
            "original_name": original_name,
            "file_key": file_key,
            "file_type": config["file_type"],       # IMAGE, DOCUMENT,...
            "usage_type": usage_type,               # AVATAR, CONTRACT,...
            "content_type": content_type,
            "file_size": file_size,
            "reference_entity_id": reference_entity_id,
            "reference_entity_type": config["ref_type"] if reference_entity_id else None,
            "orphaned_detected_at": orphaned_detected_at,
            "status": "ACTIVE",
            "created_by": created_by,
            "created_at": created_at
        })
        
    return files

def get_id_by_file_key(cursor, file_key: str):
    """Kiểm tra xem file_key này đã tồn tại trong DB chưa."""
    cursor.execute("SELECT id FROM file_metadata WHERE file_key = %s", (file_key,))
    row = cursor.fetchone()
    if row:
        return row["id"] if isinstance(row, dict) else row[0]
    return None

def seed(cursor):
    """Insert dữ liệu file_metadata (idempotent theo `file_key`)."""
    print("→ Seeding file_metadata...")
    files_data = generate_files_data(cursor)
    
    for f in files_data:
        existing_id = get_id_by_file_key(cursor, f["file_key"])
        if existing_id:
            print(f"   [skip] File {f['original_name']} đã tồn tại (id={existing_id})")
            continue
            
        new_id = snowflake.next_id()
        
        # Insert 14 cột đầy đủ gồm created_by
        cursor.execute(
            """
            INSERT INTO file_metadata (
                id, file_key, original_name, file_size, content_type, 
                file_type, usage_type, status, reference_entity_id, 
                reference_entity_type, orphaned_detected_at, 
                created_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                new_id,
                f["file_key"],
                f["original_name"],
                f["file_size"],
                f["content_type"],
                f["file_type"],
                f["usage_type"],
                f["status"],
                f["reference_entity_id"],
                f["reference_entity_type"],
                f["orphaned_detected_at"],
                f["created_by"],
                f["created_at"],
                f["created_at"]
            )
        )
        # In log trực quan
        ref_status = f"ref_id={f['reference_entity_id']} ({f['reference_entity_type']})" if f['reference_entity_id'] else "ORPHANED"
        print(f"   [insert] [{f['usage_type']:<21}] {f['original_name']:<30} (by User #{f['created_by']}) - {ref_status}")

if __name__ == "__main__":
    pass