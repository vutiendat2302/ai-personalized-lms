---
name: ailms-database
description: Quản lý database schema, SQL migration theo version, tài liệu database và script sinh dữ liệu của AILMS trong database/. Sử dụng khi thay đổi table, column, index, constraint, foreign key, migration, DATABASE.md, full.md, Snowflake ID hoặc gen_data. Không sử dụng cho JPA query thông thường không đổi schema, Frontend, AI Service hoặc Docker-only.
---

# AILMS Database — Engineering Standards & Migration Guidelines

Làm việc trong thư mục `database/`.

Mọi thay đổi cấu trúc cơ sở dữ liệu phải tuân thủ chuẩn thiết kế quan hệ **Chuẩn 3 (3NF)**, chiến lược định danh phân tán **Snowflake ID 64-bit**, và cơ chế **Versioned Migration tuần tự**.

---

## 1. Nguồn Thông tin & Tính Đồng bộ (Source of Truth)

Khi làm việc với cơ sở dữ liệu, đối chiếu đồng thời:
1. `database/README.md` (Tài liệu kiến trúc tổng quan & danh mục migration).
2. `database/full.md` (Đặc tả chi tiết từng cột, kiểu dữ liệu, index và ràng buộc FK).
3. Các tệp SQL Migration tuần tự `database/vN_*.sql`.
4. Các lớp JPA Entity tương ứng trong `backend/ailms/src/main/java/com/ailms/entity/`.

> **Quy tắc:** Tuyệt đối không để xảy ra tình trạng lệch pha (schema drift) giữa JPA Entity và Database Schema. Khi thêm/sửa cột, phải cập nhật đồng bộ cả SQL Migration, JPA Entity, DTO Request/Response và MapStruct Mapper.

---

## 2. Quy chuẩn Tạo SQL Migration

1. **Đặt tên Tệp Migration Tuần tự:**
   - Định dạng: `v{N}_{mo_ta_ngan_gon_kebab_case}.sql`.
   - Kiểm tra số phiên bản lớn nhất hiện tại (ví dụ hiện tại là `v22_...`) để đặt tên cho tệp tiếp theo là `v23_...`. Không được đặt trùng số phiên bản.
2. **Quy tắc Forward Migration:**
   - Ưu tiên viết script migration theo chiều tiến (Forward). Không chỉnh sửa nội dung của các migration cũ đã được áp dụng vào môi trường phát triển / thử nghiệm.
3. **An toàn Dữ liệu khi Thay đổi Cột:**
   - Khi thêm cột `NOT NULL`, phải cung cấp giá trị mặc định (`DEFAULT`) hoặc chia làm 2 bước: Thêm cột nullable -> Update dữ liệu cũ -> Đổi sang `NOT NULL`.
   - Khi thêm ràng buộc `UNIQUE` hoặc `FOREIGN KEY`, phải kiểm tra dữ liệu hiện có để đảm bảo không bị trùng lặp hoặc vi phạm toàn vẹn quan hệ.
   - Thêm chỉ mục (`INDEX`) trên các trường khóa ngoại và các trường thường xuyên xuất hiện trong mệnh đề `WHERE`, `ORDER BY`.

---

## 3. Chiến lược Khóa chính & Định danh (Primary Key Strategy)

1. **Snowflake ID (64-bit BIGINT):** Bắt buộc sử dụng cho các bảng có dữ liệu phát sinh liên tục (`user`, `course`, `lesson`, `course_class`, `class_online`, `learning_activity_log`, `sales_order`, `payment_transaction`, `audit_log`, `file_metadata`).
2. **Auto-Increment / Small IDs:** Dành cho các bảng danh mục cấu hình tương đối tĩnh (`department`, `role`, `permission`, `category`, `interest`).
3. **Composite Primary Keys:** Dành cho các bảng liên kết n-n (`user_role`, `role_permission`, `course_teacher`, `interest_category`).

---

## 4. Quy chuẩn Sinh Dữ liệu Mẫu (`database/gen_data/`)

1. **Cấu trúc Generator theo Domain:**
   - Mỗi domain nghiệp vụ được tách thành một file Python độc lập (ví dụ `user.py`, `course.py`, `course_section.py`, `attendance.py`, `payroll.py`).
   - `main.py` chỉ làm nhiệm vụ import và điều phối thứ tự thực thi hàm `seed(cursor)`.
2. **Tôn trọng Thứ tự Phụ thuộc Khóa ngoại (Dependency Order):**
   ```text
   department -> role -> permission -> role_permission -> interest -> coupon -> category -> interest_category
   -> user -> user_role -> file_metadata -> employee -> employee_contract -> attendance
   -> student_profile -> guardian -> student_interest -> study_goal -> teacher_category -> teacher_availability
   -> course -> course_teacher -> course_section -> lesson -> learning_activity_log -> learning_session
   -> review -> degree -> lesson_resource -> course_class -> teaching_compensation -> payroll
   -> search_history -> course_package -> sales_order -> student_tuition_payment
   ```
3. **Sử dụng Snowflake Generator:** Mọi ID sinh mới trong `gen_data/` đều phải gọi hàm từ `database/gen_data/snowflake_id.py` để đảm bảo định dạng ID thống nhất với Backend.

---

## 5. Quy trình Kiểm tra & Backup

Trước khi áp dụng migration lớn hoặc chạy seed data:
```bash
# 1. Tạo bản sao lưu dự phòng
docker exec ailms-mysql-docker mysqldump -u root -p123456 --single-transaction --quick ailms > backup_pre_migration.sql

# 2. Thực thi file migration mới
docker exec -i ailms-mysql-docker mysql -u root -p123456 ailms < database/v23_new_feature.sql
```