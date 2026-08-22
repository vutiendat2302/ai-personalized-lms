"""Danh mục quyền nguyên tử chuẩn hóa cho toàn bộ phân hệ AILMS."""

from snowflake_id import snowflake


def _permissions(resource, actions):
    """Chuyển danh sách action thành tuple permission đồng nhất."""
    return [
        (
            f"{resource}:{action}",
            f"PERM_{resource}_{action}".upper().replace(":", "_").replace("-", "_")[:50],
            resource,
            action.split(":", maxsplit=1)[0],
            description,
        )
        for action, description in actions
    ]


PERMISSIONS = [
    *_permissions("user", [
        ("create", "Tạo tài khoản người dùng."), ("read", "Xem danh sách và hồ sơ người dùng."),
        ("update", "Cập nhật hồ sơ người dùng."), ("update:own", "Cập nhật hồ sơ cá nhân."),
        ("delete", "Xóa mềm tài khoản người dùng."), ("restore", "Khôi phục tài khoản đã xóa."),
        ("status", "Khóa, mở khóa hoặc thay đổi trạng thái tài khoản."),
    ]),
    *_permissions("role", [
        ("create", "Tạo vai trò tùy chỉnh."), ("read", "Xem danh mục vai trò."),
        ("update", "Cập nhật vai trò."), ("delete", "Xóa vai trò không thuộc hệ thống."),
        ("assign", "Gán hoặc thu hồi vai trò người dùng."),
    ]),
    *_permissions("permission", [
        ("read", "Xem danh mục quyền nguyên tử."), ("assign", "Cấu hình ma trận quyền theo vai trò."),
    ]),
    *_permissions("department", [
        ("create", "Tạo phòng ban."), ("read", "Xem cơ cấu tổ chức."),
        ("update", "Cập nhật phòng ban."), ("delete", "Ngừng sử dụng phòng ban."),
    ]),
    *_permissions("employee", [
        ("create", "Tạo hồ sơ nhân sự."), ("read", "Xem hồ sơ nhân sự."),
        ("update", "Cập nhật hồ sơ nhân sự."), ("delete", "Ngừng hiệu lực hồ sơ nhân sự."),
    ]),
    *_permissions("contract", [
        ("create", "Soạn hợp đồng lao động."), ("read", "Xem hợp đồng lao động."),
        ("update", "Cập nhật hợp đồng lao động."), ("approve", "Phê duyệt hợp đồng lao động."),
    ]),
    *_permissions("leave", [
        ("create:own", "Tạo đơn nghỉ của bản thân."), ("read:own", "Xem đơn nghỉ của bản thân."),
        ("cancel:own", "Hủy đơn nghỉ của bản thân."), ("read", "Xem đơn nghỉ thuộc phạm vi quản lý."),
        ("approve", "Phê duyệt hoặc từ chối đơn nghỉ."),
    ]),
    *_permissions("course", [
        ("create", "Tạo khóa học."), ("read", "Xem danh mục khóa học."),
        ("update", "Cập nhật khóa học bất kỳ."), ("update:own", "Cập nhật khóa học được phân công."),
        ("delete", "Xóa mềm khóa học."), ("approve", "Phê duyệt khóa học."),
        ("publish", "Công bố hoặc ngừng công bố khóa học."),
    ]),
    *_permissions("lesson", [
        ("create", "Tạo bài học."), ("read", "Xem nội dung bài học được phép truy cập."),
        ("update:own", "Cập nhật bài học thuộc khóa phụ trách."),
        ("delete:own", "Xóa bài học thuộc khóa phụ trách."),
    ]),
    *_permissions("class", [
        ("create", "Tạo lớp học."), ("read", "Xem lớp học được phép truy cập."),
        ("update", "Cập nhật thông tin lớp học."), ("delete", "Đóng hoặc xóa lớp học."),
        ("assign-teacher", "Phân công hoặc thay đổi giáo viên."),
        ("manage-member", "Quản lý học viên và người dạy trong lớp."),
        ("manage-schedule", "Thiết lập lịch và buổi học trực tuyến."),
    ]),
    *_permissions("attendance", [
        ("manage", "Ghi nhận và điều chỉnh điểm danh lớp phụ trách."),
        ("read", "Xem dữ liệu điểm danh thuộc phạm vi quản lý."),
        ("read:own", "Xem lịch sử điểm danh của bản thân."),
    ]),
    *_permissions("assessment", [
        ("create", "Tạo bài tập hoặc bài kiểm tra."), ("read", "Xem bài đánh giá được phép truy cập."),
        ("update:own", "Cập nhật bài đánh giá thuộc khóa phụ trách."),
        ("grade", "Chấm điểm và phản hồi bài làm."),
    ]),
    *_permissions("submission", [
        ("create", "Nộp bài làm."), ("read", "Xem bài nộp thuộc lớp phụ trách."),
        ("read:own", "Xem bài nộp của bản thân."), ("update:own", "Cập nhật bài nộp trước hạn."),
    ]),
    *_permissions("enrollment", [
        ("read", "Xem danh sách ghi danh."), ("read:own", "Xem đăng ký học của bản thân."),
        ("manage", "Điều chỉnh trạng thái ghi danh."),
    ]),
    *_permissions("cart", [
        ("manage:own", "Quản lý giỏ hàng của bản thân."),
    ]),
    *_permissions("order", [
        ("create:own", "Tạo đơn hàng của bản thân."), ("read:own", "Xem đơn hàng của bản thân."),
        ("read", "Xem đơn hàng toàn hệ thống."), ("manage", "Xử lý trạng thái đơn hàng."),
        ("refund", "Xử lý hoàn tiền đơn hàng."),
    ]),
    *_permissions("payment", [
        ("create:own", "Khởi tạo thanh toán của bản thân."),
        ("read:own", "Xem lịch sử thanh toán của bản thân."),
        ("read", "Xem giao dịch thanh toán toàn hệ thống."), ("reconcile", "Đối soát thanh toán."),
    ]),
    *_permissions("coupon", [
        ("create", "Tạo mã ưu đãi."), ("read", "Xem danh mục mã ưu đãi."),
        ("update", "Cập nhật mã ưu đãi."), ("delete", "Ngừng sử dụng mã ưu đãi."),
        ("redeem", "Áp dụng mã ưu đãi cho đơn hàng hợp lệ."),
    ]),
    *_permissions("finance", [
        ("report", "Xem báo cáo doanh thu và tài chính."),
        ("payroll", "Quản lý bảng lương và thù lao giảng dạy."),
    ]),
    *_permissions("file", [
        ("upload", "Tải tệp lên hệ thống."), ("read", "Xem hoặc tải tệp được phép truy cập."),
        ("manage", "Quản lý metadata và vòng đời tệp."),
    ]),
    *_permissions("support", [
        ("chat", "Tham gia hội thoại hỗ trợ được phân công."),
        ("manage", "Điều phối hàng chờ và chất lượng hỗ trợ."),
    ]),
    *_permissions("notification", [
        ("read:own", "Xem thông báo của bản thân."), ("manage:own", "Đánh dấu và quản lý thông báo cá nhân."),
        ("broadcast", "Gửi thông báo hệ thống theo đối tượng."),
    ]),
    *_permissions("ai", [
        ("use", "Sử dụng trợ lý AI trong phạm vi được cấp."),
        ("manage-knowledge", "Quản lý nguồn tri thức AI nội bộ."),
    ]),
    *_permissions("report", [("read", "Xem báo cáo vận hành tổng hợp.")]),
    *_permissions("audit", [("read", "Xem nhật ký kiểm toán hệ thống.")]),
    # Tên cũ được giữ để tương thích với các dữ liệu/quyền đã phát hành.
    ("assignment:create", "PERM_ASSIGN_CREATE", "assignment", "create", "Tạo bài tập cho khóa học."),
    ("assignment:read", "PERM_ASSIGN_READ", "assignment", "read", "Xem danh sách bài tập."),
    ("submission:approve", "PERM_SUB_APPROVE", "submission", "approve", "Chấm và duyệt bài nộp."),
    ("grade:create", "PERM_GRADE_CREATE", "grade", "create", "Nhập điểm cho học viên."),
    ("grade:update:own", "PERM_GRADE_UPDATE_OWN", "grade", "update", "Cập nhật điểm lớp phụ trách."),
    ("grade:read:own", "PERM_GRADE_READ_OWN", "grade", "read", "Xem điểm số của bản thân."),
    ("attendance:create", "PERM_ATT_CREATE", "attendance", "create", "Điểm danh buổi học."),
    ("timesheet:approve", "PERM_TIMESHEET_APPROVE", "timesheet", "approve", "Duyệt chấm công và nghỉ phép."),
]


def get_id_by_name(cursor, name: str):
    """Tìm permission theo natural key name."""
    cursor.execute("SELECT id FROM permission WHERE name = %s", (name,))
    row = cursor.fetchone()
    return row["id"] if row else None


def validate_catalog():
    """Kiểm tra trùng natural key và giới hạn độ dài theo schema."""
    names = [item[0] for item in PERMISSIONS]
    codes = [item[1] for item in PERMISSIONS]
    if len(names) != len(set(names)) or len(codes) != len(set(codes)):
        raise ValueError("Permission name/code bị trùng trong master catalog.")
    if any(len(name) > 50 or len(code) > 50 for name, code, *_ in PERMISSIONS):
        raise ValueError("Permission name/code vượt giới hạn VARCHAR(50).")


def seed(cursor):
    """Đồng bộ permission theo name, cập nhật thuộc tính nhưng bảo toàn ID."""
    validate_catalog()
    print("→ Seeding permissions...")
    for name, code, entity, action, description in PERMISSIONS:
        existing_id = get_id_by_name(cursor, name)
        if existing_id:
            cursor.execute(
                """UPDATE permission SET code=%s, entity=%s, action=%s, description=%s, updated_at=NOW()
                   WHERE id=%s""",
                (code, entity, action, description, existing_id),
            )
            continue
        new_id = snowflake.next_id()
        cursor.execute(
            """INSERT INTO permission
               (id, name, code, entity, action, description, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())""",
            (new_id, name, code, entity, action, description),
        )
    print(f"   [completed] permissions synchronized: {len(PERMISSIONS)}")
