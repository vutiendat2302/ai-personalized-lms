# AILMS Master Data Catalog

## 1. Mục tiêu

Bộ dữ liệu này là nguồn danh mục ổn định dùng cho báo cáo và demo cuối dự án. Dữ liệu được đồng bộ theo natural key, có thể chạy lặp lại và không tạo giao dịch giả.

## 2. Phạm vi static data

| Nhóm | Bảng | Natural key | Quy tắc |
| :--- | :--- | :--- | :--- |
| Tổ chức | `department` | `code` | Cập nhật metadata, bảo toàn ID |
| RBAC | `role` | `code` | Sáu system role khớp workspace hiện hành |
| RBAC | `permission` | `name` | Quyền nguyên tử dạng `resource:action[:scope]` |
| RBAC | `role_permission` | `role_id + permission_id` | ADMIN toàn quyền; các role còn lại theo least privilege |
| Taxonomy | `category` | `name` | Danh mục đào tạo đa lĩnh vực |
| Taxonomy | `interest` | `code` | Chủ đề tổng quát và thẻ kỹ năng chuyên sâu |
| Taxonomy | `interest_category` | khóa chính kép | Chỉ liên kết các natural key có thật |
| Promotion | `coupon` | `code` | Không gắn course, `used_count=0`, không tạo giao dịch |
| Qualification | `degree` | `university_name + title` | Gán category xác định, không random |

`study_goal` không phải master table vì schema yêu cầu `user_id NOT NULL`. File `study_goal.py` cung cấp catalog mẫu mục tiêu ổn định và chỉ tạo bản ghi sau khi đã có `student_profile`.

## 3. Asset dùng cho dữ liệu demo

- Avatar: dùng bốn ảnh thật trong `file/avatar/`, không gọi dịch vụ ảnh ngẫu nhiên bên ngoài.
- Hợp đồng: dùng `file/contract-fake.pdf` với object key chuẩn `seed-assets/contracts/employment-contract-demo.pdf`.
- Ảnh khóa học: dùng ba ảnh trong `file/course/`.
- `assets.py` là source of truth cho đường dẫn local, object key và MIME type; runner static kiểm tra mọi tệp tồn tại và có nội dung.

## 4. Quy trình chạy

1. Áp dụng migration mới nhất, gồm `v24_expand_degree_qualification_types.sql`.
2. Cấu hình `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Chạy dry-run để kiểm tra schema, khóa ngoại và asset.
4. Chạy riêng phase static hoặc toàn bộ pipeline bằng entrypoint `main.py`.

```bash
cd database/gen_data
python main.py --phase static --dry-run
python main.py --phase static
```

Runner chạy toàn bộ module trong một transaction. Nếu có lỗi, mọi thay đổi được rollback.
