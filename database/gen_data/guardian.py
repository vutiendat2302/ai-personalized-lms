"""
guardian.py
------------------
Seed dữ liệu cho bảng `guardian` (Người giám hộ).
- Chỉ lấy các học viên nhỏ hơn 18 tuổi (is_minor = True) từ bảng student_profile.
- Xử lý GuardianRelationship theo STRING (FATHER, MOTHER, GUARDIAN, OTHER).
- Họ tên, SĐT, Email, Địa chỉ sinh chuẩn theo giới tính và ngữ cảnh Việt Nam.
- Cố định seed 100% (random.seed(42)).
"""

import random
from datetime import datetime
from faker import Faker
from snowflake_id import snowflake

# --- KHÓA SEED ĐỂ CỐ ĐỊNH DỮ LIỆU 100% ---
Faker.seed(42)
random.seed(42)
# -----------------------------------------

fake = Faker("vi_VN")

# Tỉ lệ mối quan hệ: 45% Bố, 45% Mẹ, 7% Người giám hộ khác, 3% Khác
RELATIONSHIP_POOL = (
    ["FATHER"] * 45 + ["MOTHER"] * 45 + ["GUARDIAN"] * 7 + ["OTHER"] * 3
)


def get_admin_id(cursor):
    """Lấy ID của Admin để gán vào created_by."""
    query = """
        SELECT u.id 
        FROM user u
        JOIN user_role ur ON u.id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        WHERE r.code = 'ADMIN'
        LIMIT 1
    """
    cursor.execute(query)
    row = cursor.fetchone()
    return row["id"] if row else None


def get_minor_students(cursor):
    """
    Lấy danh sách user_id của học viên VỊ THÀNH NIÊN (is_minor = True / 1).
    """
    query = """
        SELECT user_id 
        FROM student_profile 
        WHERE is_minor = 1 OR is_minor = TRUE
    """
    cursor.execute(query)
    # Sắp xếp theo ID để đảm bảo cố định thứ tự mỗi lần chạy script
    return sorted([row["user_id"] for row in cursor.fetchall()])


def check_guardian_exists(cursor, student_user_id: int):
    """Kiểm tra học viên này đã có người giám hộ chưa (Idempotent)."""
    cursor.execute(
        "SELECT id FROM guardian WHERE student_user_id = %s LIMIT 1",
        (student_user_id,),
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Hàm seed chính được gọi từ main.py."""
    print("→ Seeding guardians (Người giám hộ cho học viên < 18 tuổi)...")

    # 1. Lấy ID Admin
    admin_id = get_admin_id(cursor)
    if not admin_id:
        print("   [warning] Không tìm thấy user ADMIN! Tạm để NULL cho created_by.")
        admin_id = None

    # 2. Lấy danh sách học viên nhỏ tuổi
    minor_students = get_minor_students(cursor)
    if not minor_students:
        print("   [warning] Không tìm thấy học viên nào có is_minor = True trong student_profile!")
        return

    total_minors = len(minor_students)
    print(f"   [info] Tìm thấy {total_minors} học viên vị thành niên để tạo người giám hộ.")

    total_inserted = 0
    total_skipped = 0

    # 3. Lặp qua danh sách học viên nhỏ tuổi để tạo guardian
    for student_user_id in minor_students:
        # Check idempotent
        if check_guardian_exists(cursor, student_user_id):
            total_skipped += 1
            continue

        # Chọn ngẫu nhiên chuỗi mối quan hệ theo tỉ lệ
        rel_string = random.choice(RELATIONSHIP_POOL)

        # Sinh họ tên tương ứng với mối quan hệ
        if rel_string == "FATHER":    # Bố -> Tên nam
            full_name = fake.name_male()
        elif rel_string == "MOTHER":  # Mẹ -> Tên nữ
            full_name = fake.name_female()
        else:                         # GUARDIAN / OTHER -> Tên ngẫu nhiên
            full_name = fake.name()

        # Tạo SĐT, email và địa chỉ tự nhiên
        phone = fake.phone_number()
        
        # Email làm sạch từ họ tên
        name_slug = fake.slug(full_name).replace("-", "")
        email = f"{name_slug}.phuhuynh_{random.randint(10, 99)}@gmail.com"
        
        address = fake.address()

        now = datetime.now()
        new_id = snowflake.next_id()

        # 4. Insert vào DB
        cursor.execute(
            """
            INSERT INTO guardian (
                id, student_user_id, full_name, relationship, 
                phone, email, address, 
                created_by, updated_by, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                new_id,
                student_user_id,
                full_name,
                rel_string,   # Lưu thẳng chữ "FATHER", "MOTHER"...
                phone,
                email,
                address,
                admin_id,     # created_by
                None,         # updated_by
                now,          # created_at
                now,          # updated_at
            ),
        )
        total_inserted += 1
        print(f"   [insert] PH: {full_name:<25} | {rel_string:<8} | Student ID: {student_user_id}")

    print(f"   [completed] Đã seed xong guardian! Inserted: {total_inserted} | Skipped: {total_skipped}.")