---
name: ailms-database
description: Quản lý database schema, SQL migration theo version, tài liệu database và script sinh dữ liệu của AILMS trong database/. Sử dụng khi thay đổi table, column, index, constraint, foreign key, migration, DATABASE.md, full.md, Snowflake ID hoặc gen_data. Không sử dụng cho JPA query thông thường không đổi schema, Frontend, AI Service hoặc Docker-only.
---

# AILMS Database

Làm việc trong `database`.

Đối chiếu Backend entity khi schema được sử dụng bởi ứng dụng.

## Nguồn thông tin

Kiểm tra:

- `DATABASE.md`;
- `full.md`;
- migration `vN_*.sql`;
- Backend JPA entity.

Nếu chúng mâu thuẫn, không đoán.

Xác minh implementation thực tế trước.

## Migration

Schema change sử dụng migration có version.

Kiểm tra migration gần nhất trước khi tạo file tiếp theo.

Ưu tiên forward migration.

Không sửa migration cũ đã có khả năng được apply nếu không có yêu cầu rõ ràng.

Trước khi thêm:

- `NOT NULL`;
- unique constraint;
- foreign key;
- type mới;
- remove column

phải xét dữ liệu hiện tại.

## Đồng bộ Backend

Khi schema thay đổi, kiểm tra các thành phần liên quan:

- entity;
- enum;
- repository;
- DTO;
- mapper;
- service.

Không để JPA mapping lệch database.

## ID

Giữ Snowflake ID convention.

Không tự tạo thêm chiến lược ID khác trong gen-data nếu không cần.

## Gen data

Script nằm tại:

`database/gen_data`

Giữ generator theo domain.

Không biến `main.py` thành một file chứa toàn bộ logic sinh dữ liệu.

Dữ liệu sinh phải tôn trọng:

- foreign key;
- business constraint;
- thứ tự phụ thuộc.

Không sử dụng production credential hoặc production data.

## An toàn

Không reset/xóa database chỉ để migration chạy được.

Không thực hiện destructive operation khi chưa biết rõ environment đích.

Nếu schema ảnh hưởng API-visible data, áp dụng thêm `ailms-api-contract`.

## Tài liệu

Cập nhật `DATABASE.md`/`full.md` khi schema thực tế thay đổi.

Phân biệt rõ schema đang tồn tại và schema đang được lên kế hoạch.