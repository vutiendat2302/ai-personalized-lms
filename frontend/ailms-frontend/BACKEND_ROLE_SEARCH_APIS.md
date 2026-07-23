# Đặc Tả Chức Năng Thanh Tìm Kiếm & Danh Sách API Theo Hết 5 Vai Trò (Roles)

Hệ thống AILMS hỗ trợ 5 vai trò người dùng cốt lõi. Dưới đây là phân tích chi tiết về **sự khác biệt của thanh tìm kiếm** đối với từng vai trò, cùng các **endpoint API cần hỗ trợ ở Backend**.

---

## 1. Bản Đồ Tổng Quan Chức Năng Tìm Kiếm

| Vai trò (Role) | Đối tượng tìm kiếm chính (Search Target) | Mục đích tìm kiếm |
| :--- | :--- | :--- |
| **STUDENT / USER** (Học sinh) | Khóa học hoạt động, Lộ trình học, Diễn đàn câu hỏi | Tìm kiếm tài liệu, khóa học phù hợp để học |
| **TEACHER** (Giảng viên) | Bài giảng, Bài tập, Danh sách học sinh của mình, Bài nộp | Quản lý giảng dạy, chấm bài, theo dõi tiến độ lớp học |
| **TA** (Trợ giảng) | Câu hỏi Q&A cần giải đáp, Bài tập cần chấm điểm, Học sinh | Hỗ trợ giảng dạy, trả lời thắc mắc, chấm bài |
| **HR** (Doanh nghiệp) | Nhân viên/Học viên nội bộ, Báo cáo học tập, Chứng chỉ | Quản lý đào tạo nhân sự, kiểm tra KPI học tập |
| **ADMIN** (Quản trị viên) | Người dùng, Vai trò, Quyền hạn, Khóa học cần phê duyệt, Log | Quản trị hệ thống, phê duyệt nội dung, kiểm toán (audit) |

---

## 2. Chi Tiết Chức Năng & Danh Sách API Backend Cần Thiết

### 2.1. Vai trò STUDENT / USER (Học sinh)
Tìm kiếm thông tin phục vụ học tập cá nhân.
* **Chức năng search bar:**
  * Tìm kiếm khóa học theo từ khóa, danh mục, cấp độ.
  * Autocomplete gợi ý từ khóa (ví dụ: gõ "py" gợi ý "Python").
  * Lưu trữ lịch sử tìm kiếm cá nhân (Search History) để gợi ý lại.
* **Danh sách API Backend cần có:**
  1. `GET /api/v1/courses/search` (Tìm kiếm khóa học hoạt động)
  2. `GET /api/v1/search/suggestions?keyword={keyword}` (Gợi ý autocomplete từ khóa học)
  3. `GET /api/v1/search/history` (Lấy lịch sử tìm kiếm gần đây của user)
  4. `POST /api/v1/search/history` (Lưu từ khóa vừa tìm kiếm của user)
  5. `DELETE /api/v1/search/history/{id}` (Xóa một từ khóa trong lịch sử)

---

### 2.2. Vai trò TEACHER (Giảng viên)
Tìm kiếm phục vụ công tác soạn bài, giảng dạy và quản lý lớp học.
* **Chức năng search bar:**
  * Tìm kiếm các khóa học do chính mình giảng dạy.
  * Tìm kiếm bài tập (assignments) và bài nộp (submissions) của học viên cần chấm điểm.
  * Tìm kiếm thông tin học viên trong danh sách lớp học quản lý.
* **Danh sách API Backend cần có:**
  1. `GET /api/v1/instructor/courses/search?keyword={keyword}` (Tìm khóa học của giảng viên)
  2. `GET /api/v1/instructor/students/search?courseId={courseId}&keyword={keyword}` (Tìm học sinh trong lớp)
  3. `GET /api/v1/instructor/submissions/search?courseId={courseId}&keyword={keyword}&status={PENDING/GRADED}` (Tìm kiếm bài nộp bài tập của học sinh)

---

### 2.3. Vai trò TA (Trợ giảng)
Hỗ trợ giảng viên giải đáp thắc mắc và kiểm tra hoạt động lớp học.
* **Chức năng search bar:**
  * Tìm kiếm các câu hỏi (Q&A) trong diễn đàn khóa học được phân công hỗ trợ.
  * Tìm kiếm bài tập của học viên cần chấm điểm (theo quyền hạn phân công).
  * Tìm kiếm điểm danh, tham gia của học sinh.
* **Danh sách API Backend cần có:**
  1. `GET /api/v1/ta/questions/search?courseId={courseId}&status={UNANSWERED/ALL}&keyword={keyword}` (Tìm câu hỏi Q&A cần giải đáp gấp)
  2. `GET /api/v1/ta/submissions/search?courseId={courseId}&keyword={keyword}` (Tìm bài nộp được phân công chấm)

---

### 2.4. Vai trò HR (Doanh nghiệp - Quản lý nhân viên học tập)
Theo dõi tiến độ học tập và hiệu quả đào tạo của nhân viên trong tổ chức.
* **Chức năng search bar:**
  * Tìm kiếm nhân viên trong công ty theo tên, mã nhân viên, phòng ban.
  * Tìm kiếm báo cáo học tập (Completion Rate, thời gian học) của từng người.
  * Tìm kiếm chứng chỉ (certificates) nhân viên đã nhận.
* **Danh sách API Backend cần có:**
  1. `GET /api/v1/hr/employees/search?department={department}&keyword={keyword}` (Tìm kiếm nhân viên trong công ty)
  2. `GET /api/v1/hr/certificates/search?employeeId={employeeId}&keyword={keyword}` (Tìm chứng chỉ nhân viên đạt được)
  3. `GET /api/v1/hr/learning-reports/search?keyword={keyword}` (Tìm báo cáo học tập của đội ngũ)

---

### 2.5. Vai trò ADMIN (Quản trị viên hệ thống)
Quản trị toàn diện hệ thống, phê duyệt nội dung và phân quyền.
* **Chức năng search bar:**
  * Tìm kiếm người dùng (để chỉnh sửa thông tin, khóa tài khoản, phân vai trò).
  * Tìm kiếm vai trò (Roles) và quyền hạn (Permissions) trên hệ thống.
  * Tìm kiếm khóa học mới đăng để phê duyệt (workflow duyệt khóa học).
  * Tìm kiếm nhật ký hoạt động hệ thống (Audit Logs) để truy vết lỗi/bảo mật.
* **Danh sách API Backend cần có:**
  1. `GET /api/v1/admin/users/search?role={role}&status={status}&keyword={keyword}` (Tìm kiếm người dùng - Đã có)
  2. `GET /api/v1/admin/audit-logs/search?keyword={keyword}&from={date}&to={date}` (Tìm nhật ký hệ thống - Đã có)
  3. `GET /api/v1/admin/courses/search?status={PENDING_APPROVAL/DRAFT/ACTIVE}&keyword={keyword}` (Tìm kiếm khóa học chờ phê duyệt)
  4. `GET /api/v1/admin/roles/search?keyword={keyword}` (Tìm kiếm vai trò)
  5. `GET /api/v1/admin/permissions/search?keyword={keyword}` (Tìm kiếm quyền hạn)
