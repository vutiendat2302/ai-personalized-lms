---
name: ailms-backend
description: Phát triển, sửa lỗi, refactor, review và kiểm thử Backend AILMS tại backend/ailms sử dụng Java 25, Spring Boot, Maven, Spring Data JPA, Spring Security, MapStruct, MySQL, Redis và MinIO. Sử dụng khi công việc liên quan controller, service, repository, entity, DTO, mapper, security, validation, event, job, lock, Maven, backend test hoặc Backend gọi AI Service. Không sử dụng cho công việc chỉ liên quan Frontend, AI Service, SQL migration, Docker hoặc tài liệu. Neu he thong khong co java 25 de test thi khong can test lai nua. 
---

# AILMS Backend

Làm việc trong `backend/ailms`.

Luôn đọc implementation hiện có và các file lân cận trước khi chỉnh sửa. Không tự tạo kiến trúc mới nếu project đã có pattern tương ứng.

## Phân lớp

Xác định đúng vị trí thay đổi:

- REST API → `controller`
- Request DTO → `request`
- Response DTO → `response`
- DTO dùng chung → `dto`
- Business logic → `service` / `service/imp`
- Logic tính toán chuyên biệt → `service/calculator`
- Lock/concurrency → `service/lock`
- Database query/Specification → `repository`
- Persistence model → `entity`
- Chuyển đổi DTO/entity → `mapper`
- JWT/RBAC/authentication → `security`
- Spring/application config → `config`
- Thành phần dùng chung → `common`
- Event/audit → `event`
- Background/scheduled task → `job`
- Gọi AI Service → `client`

## Luồng xử lý

Giữ luồng chính:

`Controller → Validation → Service → Repository`

Controller chỉ:

- nhận request;
- validate;
- gọi service;
- trả response theo format hiện tại.

Không đặt business logic hoặc database query trong controller.

Đặt nghiệp vụ trong service.

Đặt truy cập dữ liệu và Specification trong repository.

Không trả JPA entity trực tiếp qua API.

## DTO và MapStruct

Sử dụng request/response DTO tại biên API.

Ưu tiên MapStruct mapper hiện có.

Khai báo mapping hoặc ignore rõ ràng đối với các field do entity quản lý.

Không vô tình ghi đè:

- ID;
- audit field;
- timestamp;
- relationship;
- field được quản lý bởi persistence lifecycle.

Trước khi map thủ công, kiểm tra project đã có mapper phù hợp chưa.

## JPA và database

Giữ nguyên ownership của relationship.

Không tự ý thay đổi:

- `FetchType`;
- cascade;
- nullable;
- foreign key;
- relationship ownership;
- chiến lược ID.

Sử dụng Snowflake ID theo hạ tầng hiện tại khi entity thuộc convention đó.

Không đổi Snowflake sang auto increment hoặc UUID nếu nghiệp vụ không yêu cầu.

Nếu thay đổi entity ảnh hưởng schema, kiểm tra migration tương ứng.

Cac ma code deu sinh tu dong trong be, va khong duoc phep update, thay doi.

## Exception và validation

Sử dụng Bean Validation cho request.

Tuân theo exception hiện có.

Không thêm `try/catch` vào controller chỉ để chuyển exception thành HTTP response.

Để `GlobalExceptionHandler` xử lý lỗi theo convention project.

## Security

Giữ nguyên kiến trúc JWT + RBAC hiện tại.

Không bỏ authentication/authorization chỉ để endpoint chạy được.

Tái sử dụng role và permission hiện có.

Không log:

- password;
- OTP;
- access token;
- refresh token;
- internal token;
- secret.

## Event và Audit

Ưu tiên Application Event cho audit và side effect đã có pattern event.

Không gắn cứng audit logic vào nhiều service khác nhau nếu event có thể xử lý.

Không để lỗi audit phá hỏng transaction nghiệp vụ chính nếu kiến trúc hiện tại đã tách biệt chúng.

Them audilog neu chua co audilog cho cac phuong thuc thay doi du lieu. 

## Lock và concurrency

Kiểm tra `service/lock` trước khi thêm cơ chế khóa mới.

Tái sử dụng optimistic/pessimistic strategy hiện có.

Không tự thêm `synchronized`, distributed lock hoặc cơ chế lock khác nếu chưa hiểu lock hiện tại.

## Redis và MinIO

Tái sử dụng configuration/service abstraction hiện có.

Không tạo Redis/MinIO client trực tiếp trong controller hoặc service không liên quan.

Không duplicate cấu hình.

## AI Service

Backend là gateway duy nhất giữa application và AI Service.

Mọi lời gọi AI phải đi qua client chung trong `client`.

Không gọi Gemini SDK trực tiếp từ Backend.

Gửi internal authentication token theo config hiện tại.

Không log prompt/response chứa dữ liệu nhạy cảm.

Nếu thay đổi contract Backend ↔ AI Service, áp dụng thêm `ailms-api-contract`.

## Maven

Chạy Maven tại:

`backend/ailms`

Luôn ưu tiên Maven Wrapper:

`./mvnw`

Đọc `pom.xml` trước khi thay dependency/plugin/version.

Không thêm dependency nếu stack hiện tại đã giải quyết được vấn đề.

Không nâng version framework như một side effect của feature khác.

## Kiểm tra

Compile:

`./mvnw -DskipTests compile`

Test:

`./mvnw test`

Ưu tiên test phạm vi nhỏ trước, sau đó mới chạy toàn bộ nếu cần.

Không báo hoàn thành khi compile hoặc test liên quan vẫn lỗi.

Kiểm tra diff cuối cùng để tránh thay đổi ngoài phạm vi.