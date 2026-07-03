# Nhật ký tiến độ dự án (Project Progress)

## Ngày 2026-07-03

**Những việc đã làm hôm nay:**

* **Hệ thống xác thực & Phân quyền (RBAC):**
  * Thiết lập và cấu hình `Spring Security` kết hợp với `JWT` (`SecurityConfig.java`, `JwtAuthenticationResponse.java`, `CustomUserDetailsService.java`, `AuthController.java`).
  * Triển khai cơ chế phân quyền (Authorization) chi tiết dựa trên Role và Permission.
  * Xây dựng luồng đăng ký / đăng nhập cho người dùng.
* **Quản lý User, Role, Permission (CRUD):**
  * Hoàn thiện các API CRUD đầy đủ cho người dùng (User).
  * Hoàn thiện các API CRUD cho Role và Permission để phục vụ quản lý truy cập (RBAC).
* **Quản lý tài nguyên và Khóa học (Resource, Category & Course):**
  * Xây dựng các API cơ bản (CRUD) cho Category (`CategoryController.java`).
  * Khởi tạo các API cho Course (`CourseController.java`, `CreateCourseRequest.java`).
  * Định nghĩa các class Request để tạo và cập nhật tài nguyên (`CreateResourceRequest.java`, `UpdateResourceRequest.java`).

*(Bạn có thể tiếp tục bổ sung thêm các công việc chi tiết vào đây nhé!)*
