-- Policy dùng file_metadata + MinIO thay vì một bảng nội dung riêng.
-- Upload policy với usage_type=POLICY sẽ tạo object trong thư mục policies/.
DROP TABLE IF EXISTS support_policy;
