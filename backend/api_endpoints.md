# AI Personalized LMS - API Endpoints Documentation

Dưới đây là danh sách đầy đủ toàn bộ các **API Endpoints** của hệ thống **AI Personalized LMS Backend**, được phân loại chi tiết theo 8 module nghiệp vụ chính.

---

## 1. Module Auth, User & Permission (Xác thực & Phân quyền)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản người dùng mới |
| `POST` | `/api/v1/auth/login` | Đăng nhập hệ thống (trả về JWT Token) |
| `POST` | `/api/v1/auth/refresh` | Làm mới Access Token bằng Refresh Token |
| `POST` | `/api/v1/auth/logout` | Đăng xuất khỏi hệ thống |
| `GET` | `/api/v1/users` | Lấy danh sách người dùng (phân trang, tìm kiếm) |
| `GET` | `/api/v1/users/{id}` | Lấy thông tin chi tiết người dùng |
| `POST` | `/api/v1/users` | Admin tạo người dùng mới |
| `PUT` | `/api/v1/users/{id}` | Cập nhật thông tin người dùng |
| `DELETE` | `/api/v1/users/{id}` | Xóa / Khóa tài khoản người dùng |
| `GET` | `/api/v1/roles` | Lấy danh sách Vai trò (Roles) |
| `POST` | `/api/v1/roles` | Tạo Vai trò mới |
| `PUT` | `/api/v1/roles/{id}` | Cập nhật thông tin Vai trò |
| `DELETE` | `/api/v1/roles/{id}` | Xóa Vai trò |
| `POST` | `/api/v1/roles/{roleId}/permissions` | Gán danh sách Quyền (Permissions) cho Vai trò |
| `GET` | `/api/v1/permissions` | Lấy danh sách toàn bộ Quyền trong hệ thống |

---

## 2. Module HR & Personnel Management (Quản lý Nhân sự & Chấm công - Lương)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/employees` | Tạo hồ sơ nhân sự (tự động sinh unique `employee_code`) |
| `GET` | `/api/v1/employees/{id}` | Xem chi tiết thông tin nhân sự |
| `PUT` | `/api/v1/employees/{id}` | Cập nhật hồ sơ nhân sự |
| `POST` | `/api/v1/employee-contracts` | Tạo hợp đồng nhân sự (upload file scan/ký số, gửi email đính kèm) |
| `GET` | `/api/v1/employee-contracts/expiring` | Xem danh sách hợp đồng sắp hết hạn thử việc/chính thức (trước 1 tuần) |
| `POST` | `/api/v1/attendances/check-in` | Check-in chấm công nhân sự Full-time |
| `POST` | `/api/v1/attendances/check-out` | Check-out chấm công nhân sự Full-time |
| `POST` | `/api/v1/leave-requests` | Gửi đơn xin nghỉ phép |
| `POST` | `/api/v1/leave-requests/{id}/approve` | Duyệt / Từ chối đơn xin nghỉ phép |
| `POST` | `/api/v1/teaching-session-payments/check-in` | Check-in ca dạy cho Giảng viên/TA Part-time |
| `POST` | `/api/v1/teaching-session-payments/check-out` | Check-out ca dạy cho Giảng viên/TA Part-time |
| `POST` | `/api/v1/salaries/calculate-full-time` | Tính lương hàng tháng cho nhân sự Full-time (theo base_salary, đi muộn, phạt) |
| `POST` | `/api/v1/salaries/calculate-part-time` | Tính lương hàng tháng cho Giảng viên/TA Part-time (theo số giờ/buổi dạy) |
| `GET` | `/api/v1/salaries/payslip/{employeeId}` | Trích xuất phiếu lương (Payslip) |

---

## 3. Module Student Management (Quản lý Học viên)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/students/profile` | Xem hồ sơ học viên (trả về cờ `has_onboarding_goal_prompt`) |
| `POST` | `/api/v1/students/profile` | Cập nhật thông tin hồ sơ học viên |
| `POST` | `/api/v1/students/onboarding/skip-goal` | Học viên chọn bỏ qua nhập mục tiêu ban đầu |
| `GET` | `/api/v1/study-goals` | Danh sách mục tiêu học tập của học viên |
| `POST` | `/api/v1/study-goals` | Tạo mới mục tiêu học tập |
| `PUT` | `/api/v1/study-goals/{id}` | Cập nhật mục tiêu học tập |
| `POST` | `/api/v1/guardians` | Thêm thông tin Người giám hộ (dành cho học viên dưới 18 tuổi) |
| `GET` | `/api/v1/learning-activity-logs` | Xem nhật ký hoạt động học tập |

---

## 4. Module Course Management (Quản lý Khóa học & Nội dung)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/categories` | Lấy danh sách danh mục khóa học |
| `POST` | `/api/v1/categories` | Admin tạo danh mục khóa học mới |
| `POST` | `/api/v1/categories/{id}/teachers` | Admin gán / hủy gán Giảng viên & TA vào danh mục |
| `GET` | `/api/v1/courses` | Lấy danh sách khóa học (phân trang, lọc theo category) |
| `POST` | `/api/v1/courses` | Teacher tạo khóa học mới thuộc category đã gán (tự định giá, status = DRAFT) |
| `POST` | `/api/v1/courses/{id}/submit` | Trình duyệt khóa học gửi Management xem xét |
| `POST` | `/api/v1/courses/{id}/approve` | Management duyệt / từ chối xuất bản khóa học |
| `POST` | `/api/v1/courses/{id}/sections` | Thêm chương học (Section) |
| `POST` | `/api/v1/sections/{id}/lessons` | Thêm bài học (Lesson) |
| `POST` | `/api/v1/lessons/{id}/resources` | Thêm tài liệu bài học (Lesson Resource) |

---

## 5. Module Order & Payment Management (Đơn hàng & Thanh toán)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/cart/items` | Thêm khóa học / gói học vào giỏ hàng |
| `DELETE` | `/api/v1/cart/items/{id}` | Xóa mục khỏi giỏ hàng |
| `POST` | `/api/v1/coupons` | Tạo mã giảm giá / Coupon mới |
| `POST` | `/api/v1/coupons/validate` | Kiểm tra điều kiện & tính số tiền giảm giá của Coupon |
| `POST` | `/api/v1/orders` | Tạo đơn hàng mới (`status = PENDING`) |
| `POST` | `/api/v1/orders/{id}/payment-url` | Lấy URL chuyển hướng thanh toán (VNPAY / MOMO) |
| `POST` | `/api/v1/orders/webhook/vnpay` | Callback Webhook xử lý kết quả thanh toán (chuyển `PAID`, kích hoạt enrollment & xếp lớp) |

---

## 6. Module Class Management (Quản lý Lớp học & Ghép Gia sư)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/classes` | Admin tạo lớp học nhóm (Group Class, kiểm tra trùng lịch dạy của giáo viên) |
| `POST` | `/api/v1/classes/placement` | Xếp lớp tự động (`GROUP_CLASS` -> Waitlist FIFO khi đầy, hoặc `ONE_ON_ONE` -> Dynamic Matching) |
| `POST` | `/api/v1/classes/transfer-request` | Gửi yêu cầu xin chuyển lớp nhóm |
| `POST` | `/api/v1/classes/transfer-request/{id}/approve` | Duyệt yêu cầu chuyển lớp (tự động đôn học viên danh sách chờ ở lớp cũ) |
| `POST` | `/api/v1/classes/teacher-change-request` | Gửi yêu cầu đổi Gia sư 1 kèm 1 |
| `POST` | `/api/v1/classes/teacher-change-request/{id}/approve` | Duyệt yêu cầu đổi Gia sư 1 kèm 1 |
| `POST` | `/api/v1/classes/{id}/reschedule` | Thay đổi lịch học online (tự động gửi email thông báo cho học viên) |
| `POST` | `/api/v1/classes/{id}/teacher-withdrawal` | Xử lý trường hợp Giáo viên xin rút khỏi lớp & tự động ghép Giáo viên mới |

---

## 7. Module Assessment & Progress (Đánh giá, Kiểm tra & Tiến độ)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/quizzes` | Giảng viên tạo bài kiểm tra Quiz |
| `POST` | `/api/v1/quizzes/{id}/attempts` | Học viên bắt đầu làm bài quiz (kiểm tra `max_attempts`) |
| `POST` | `/api/v1/quiz-attempts/{id}/submit` | Nộp bài quiz & Tự động chấm điểm trắc nghiệm |
| `POST` | `/api/v1/quiz-attempts/{id}/grade` | Giảng viên/TA chấm tay các câu hỏi tự luận / điền từ (`FILL_BLANK`) |
| `POST` | `/api/v1/assignments` | Giảng viên tạo bài tập về nhà (Assignment, quy định hạn nộp & nộp trễ) |
| `POST` | `/api/v1/assignments/{id}/submissions` | Học viên nộp bài tập (tự động kiểm tra trễ hạn `is_late`) |
| `POST` | `/api/v1/submissions/{id}/grade` | Giảng viên chấm điểm Assignment / Trả bài yêu cầu nộp lại |
| `GET` | `/api/v1/reports/class-progress` | Báo cáo tiến độ học viên theo lớp (cảnh báo học viên "có nguy cơ" bỏ học) |
| `GET` | `/api/v1/reports/system-dashboard` | Dashboard báo cáo tổng quan hệ thống cho Admin/HR |

---

## 8. System & Utilities (Chứng chỉ, File & Log)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/certificates/user/{userId}` | Lấy danh sách chứng chỉ đã cấp của học viên |
| `GET` | `/api/v1/certificates/verify/{code}` | Trang tra cứu & xác thực chứng chỉ công khai qua Certificate Code |
| `POST` | `/api/v1/files/upload` | Upload file hợp đồng, tài liệu, bài tập (S3 / MinIO) |
| `GET` | `/api/v1/audit-logs` | Truy vấn nhật ký hành động hệ thống (Audit Logs) |
