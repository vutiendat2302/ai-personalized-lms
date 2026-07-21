"""
seed_permissions.py
---------------------
Seed dữ liệu cho bảng `permissions`.
name = "resource:action", hỗ trợ hậu tố ":own" cho ABAC scope.
"""

from snowflake_id import snowflake

# (name, code, entity, action, description)
PERMISSIONS = [
    # --- user ---
    ("user:create", "PERM_USER_CREATE", "user", "create", "Tạo mới tài khoản người dùng."),
    ("user:read", "PERM_USER_READ", "user", "read", "Xem danh sách và thông tin người dùng."),
    ("user:update", "PERM_USER_UPDATE", "user", "update", "Cập nhật thông tin người dùng bất kỳ."),
    ("user:update:own", "PERM_USER_UPDATE_OWN", "user", "update", "Cập nhật thông tin cá nhân của chính mình."),
    ("user:delete", "PERM_USER_DELETE", "user", "delete", "Xóa tài khoản người dùng."),
    # --- role / permission ---
    ("role:create", "PERM_ROLE_CREATE", "role", "create", "Tạo vai trò mới."),
    ("role:read", "PERM_ROLE_READ", "role", "read", "Xem danh sách vai trò."),
    ("role:update", "PERM_ROLE_UPDATE", "role", "update", "Cập nhật vai trò và gán quyền."),
    ("role:delete", "PERM_ROLE_DELETE", "role", "delete", "Xóa vai trò (trừ role hệ thống)."),
    ("permission:read", "PERM_PERMISSION_READ", "permission", "read", "Xem danh sách quyền hạn trong hệ thống."),
    # --- department ---
    ("department:create", "PERM_DEPT_CREATE", "department", "create", "Tạo mới phòng ban."),
    ("department:read", "PERM_DEPT_READ", "department", "read", "Xem danh sách phòng ban."),
    ("department:update", "PERM_DEPT_UPDATE", "department", "update", "Cập nhật thông tin phòng ban."),
    ("department:delete", "PERM_DEPT_DELETE", "department", "delete", "Xóa phòng ban."),
    # --- course ---
    ("course:create", "PERM_COURSE_CREATE", "course", "create", "Tạo mới khóa học."),
    ("course:read", "PERM_COURSE_READ", "course", "read", "Xem thông tin khóa học."),
    ("course:update", "PERM_COURSE_UPDATE", "course", "update", "Cập nhật khóa học bất kỳ."),
    ("course:update:own", "PERM_COURSE_UPDATE_OWN", "course", "update", "Cập nhật khóa học do chính mình phụ trách."),
    ("course:delete", "PERM_COURSE_DELETE", "course", "delete", "Xóa khóa học."),
    ("course:approve", "PERM_COURSE_APPROVE", "course", "approve", "Phê duyệt khóa học trước khi công bố."),
    # --- lesson ---
    ("lesson:create", "PERM_LESSON_CREATE", "lesson", "create", "Tạo mới bài giảng."),
    ("lesson:read", "PERM_LESSON_READ", "lesson", "read", "Xem nội dung bài giảng."),
    ("lesson:update:own", "PERM_LESSON_UPDATE_OWN", "lesson", "update", "Cập nhật bài giảng do mình tạo."),
    ("lesson:delete:own", "PERM_LESSON_DELETE_OWN", "lesson", "delete", "Xóa bài giảng do mình tạo."),
    # --- assignment / submission ---
    ("assignment:create", "PERM_ASSIGN_CREATE", "assignment", "create", "Tạo bài tập cho khóa học."),
    ("assignment:read", "PERM_ASSIGN_READ", "assignment", "read", "Xem danh sách bài tập."),
    ("submission:create", "PERM_SUB_CREATE", "submission", "create", "Nộp bài tập."),
    ("submission:read", "PERM_SUB_READ", "submission", "read", "Xem danh sách bài nộp của học viên."),
    ("submission:update:own", "PERM_SUB_UPDATE_OWN", "submission", "update", "Chỉnh sửa bài nộp của chính mình (trước hạn)."),
    ("submission:approve", "PERM_SUB_APPROVE", "submission", "approve", "Chấm và duyệt bài nộp."),
    # --- grade / attendance ---
    ("grade:create", "PERM_GRADE_CREATE", "grade", "create", "Nhập điểm cho học viên."),
    ("grade:update:own", "PERM_GRADE_UPDATE_OWN", "grade", "update", "Cập nhật điểm cho lớp mình phụ trách."),
    ("grade:read:own", "PERM_GRADE_READ_OWN", "grade", "read", "Xem điểm số của chính mình."),
    ("attendance:create", "PERM_ATT_CREATE", "attendance", "create", "Điểm danh buổi học."),
    ("attendance:read:own", "PERM_ATT_READ_OWN", "attendance", "read", "Xem lịch sử điểm danh của chính mình."),
    # --- employee / timesheet (HR) ---
    ("employee:create", "PERM_EMP_CREATE", "employee", "create", "Tạo hồ sơ nhân viên."),
    ("employee:read", "PERM_EMP_READ", "employee", "read", "Xem hồ sơ nhân viên."),
    ("employee:update", "PERM_EMP_UPDATE", "employee", "update", "Cập nhật hồ sơ nhân viên."),
    ("timesheet:approve", "PERM_TIMESHEET_APPROVE", "timesheet", "approve", "Duyệt chấm công/nghỉ phép."),
    # --- report ---
    ("report:read", "PERM_REPORT_READ", "report", "read", "Xem các báo cáo, thống kê tổng hợp."),
]


def get_id_by_name(cursor, name: str):
    cursor.execute("SELECT id FROM permission WHERE name = %s", (name,))
    row = cursor.fetchone()
    return row["id"] if row else None


def seed(cursor):
    """Insert dữ liệu permission nếu chưa tồn tại (idempotent theo `name`)."""
    print("→ Seeding permissions...")
    for name, code, entity, action, description in PERMISSIONS:
        existing_id = get_id_by_name(cursor, name)
        if existing_id:
            print(f"   [skip] permission {name} đã tồn tại (id={existing_id})")
            continue
        new_id = snowflake.next_id()
        cursor.execute(
            """
            INSERT INTO permission (id, name, code, entity, action, description, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (new_id, name, code, entity, action, description),
        )
        print(f"   [insert] permission {name} (id={new_id})")