"""
lesson_resource.py
--------------
Seed dữ liệu cho bảng `lesson_resource`.
- Xử lý triệt để lỗi Unique Key OneToOne của file_metadata_id.
- Sử dụng thuật toán loại trừ qua SET và bọc SAVEPOINT chống rollback toàn hệ thống.
"""

import random
import pymysql
from snowflake_id import snowflake

RESOURCE_PREFIXES = [
    "Slide bài giảng:",
    "Tài liệu đọc thêm (PDF):",
    "Source code mẫu cho",
    "Bài tập thực hành đính kèm:",
    "Checklist quan trọng:",
    "Tài liệu tham khảo chuyên sâu:",
    "Đề bài project cuối khóa:"
]

# Biến global lưu các file_metadata_id đã dùng trong phiên chạy này
# (Phòng trường hợp bạn gọi lesson_resource.seed() nhiều lần trong main.py)
_used_file_ids_in_session = set()

def get_lessons(cursor):
    """Lấy danh sách các bài học (id, name)."""
    cursor.execute("SELECT id, name FROM lesson")
    return cursor.fetchall()

def get_all_available_file_metadata_ids(cursor):
    """Lọc thủ công bằng SET thay vì tin tưởng LEFT JOIN của MySQL."""
    # 1. Lấy tất cả ID đang có
    cursor.execute("SELECT id FROM file_metadata")
    all_files = {row["id"] for row in cursor.fetchall()}
    
    # 2. Lấy tất cả ID ĐÃ BỊ DÙNG trong bảng lesson_resource
    cursor.execute("SELECT file_metadata_id FROM lesson_resource WHERE file_metadata_id IS NOT NULL")
    used_in_db = {row["file_metadata_id"] for row in cursor.fetchall()}
    
    # 3. Trừ ra (Chỉ lấy những ID còn trống và chưa bị dùng trong phiên này)
    available = list(all_files - used_in_db - _used_file_ids_in_session)
    random.shuffle(available)
    return available

def check_lesson_has_resources(cursor, lesson_id: int):
    """Kiểm tra Idempotent."""
    cursor.execute("SELECT id FROM lesson_resource WHERE lesson_id = %s LIMIT 1", (lesson_id,))
    return cursor.fetchone() is not None

def seed(cursor):
    """Insert dữ liệu lesson_resource."""
    print("→ Seeding lesson resources...")
    
    lessons = get_lessons(cursor)
    if not lessons:
        print("   [error] Không có bài học (lesson) nào trong DB.")
        return
        
    available_file_ids = get_all_available_file_metadata_ids(cursor)
    
    total_inserted = 0
    lesson_count_with_resources = 0
    skip_count_due_to_error = 0

    for lesson in lessons:
        lesson_id = lesson["id"]
        lesson_name = lesson["name"]
        
        if check_lesson_has_resources(cursor, lesson_id):
            print(f"   [skip] Lesson id={lesson_id} đã có tài liệu.")
            continue
            
        # Random số lượng tài liệu (40% là 0, 30% là 1...)
        num_resources = random.choices([0, 1, 2, 3], weights=[40, 30, 20, 10], k=1)[0]
        if num_resources == 0:
            continue
            
        lesson_count_with_resources += 1
        selected_prefixes = random.sample(RESOURCE_PREFIXES, num_resources)
        
        for prefix in selected_prefixes:
            resource_name = f"{prefix} {lesson_name}"
            if len(resource_name) > 250:
                resource_name = resource_name[:250] + "..."
                
            status = random.choices(["ACTIVE", "INACTIVE"], weights=[95, 5], k=1)[0]
            
            # Lấy 1 ID ra và đánh dấu là đã dùng
            file_meta_id = None
            if available_file_ids:
                file_meta_id = available_file_ids.pop()
                _used_file_ids_in_session.add(file_meta_id)
            
            new_id = snowflake.next_id()
            
            # --- BỌC LÁ CHẮN SAVEPOINT ---
            # Nếu lỡ dính lỗi Duplicate Key, nó sẽ bắt được, bỏ qua tài liệu này
            # mà KHÔNG làm văng (rollback) toàn bộ dữ liệu của bạn.
            try:
                cursor.execute("SAVEPOINT before_insert_resource")
                cursor.execute(
                    """
                    INSERT INTO lesson_resource (
                        id, lesson_id, name, file_metadata_id, status, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                    """,
                    (
                        new_id,
                        lesson_id,
                        resource_name,
                        file_meta_id,
                        status
                    )
                )
                total_inserted += 1
            except pymysql.err.IntegrityError as e:
                # Gặp lỗi Duplicate Key -> Lùi lại đúng 1 bước này, chương trình vẫn chạy phà phà
                cursor.execute("ROLLBACK TO SAVEPOINT before_insert_resource")
                skip_count_due_to_error += 1
            # -----------------------------

    print(f"   Đã thêm mới {total_inserted} tài liệu đính kèm.")
    if skip_count_due_to_error > 0:
        print(f"   [warn] Đã tự động bỏ qua {skip_count_due_to_error} tài liệu bị trùng lặp Unique Key.")