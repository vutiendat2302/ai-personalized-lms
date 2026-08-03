# AGENTS.md

## Tổng quan dự án

AI Personalized LMS là hệ thống quản lý học tập gồm các thành phần:

- `backend/ailms`: Backend Spring Boot sử dụng Java 25, Maven, JPA, MapStruct và MySQL.
- `frontend/ailms-frontend`: Frontend sử dụng React 19, TypeScript, Vite và Tailwind CSS.
- `database`: Các script tạo dữ liệu, di chuyển dữ liệu và sửa dữ liệu.
- `docker-compose.yml`: Cấu hình chạy ứng dụng và hạ tầng trên môi trường cục bộ.

## Quy tắc làm việc chung

- Đọc phần triển khai liên quan và các quy ước ở những file lân cận trước khi chỉnh sửa.
- Chỉ thay đổi trong phạm vi yêu cầu; không tái cấu trúc những phần không liên quan.
- Bảo toàn mọi thay đổi hiện có của người dùng vì working tree có thể chưa sạch.
- Không xóa, ghi đè hoặc định dạng lại các file không liên quan.
- Ưu tiên giải pháp nhỏ nhất nhưng vẫn giải quyết đầy đủ yêu cầu.
- Không thêm thư viện mới nếu không thực sự cần thiết.
- Không commit kết quả build, file sinh tự động, cấu hình IDE, thông tin bí mật hoặc file môi trường cục bộ.
- Cập nhật tài liệu khi hành vi, cấu hình hoặc quy trình phát triển thay đổi.

## Quy ước backend

- Chạy các lệnh Maven từ thư mục `backend/ailms`.
- Tuân theo cấu trúc package hiện có trong `com.ailms`, gồm:
  `controller`, `service`, `repository`, `entity`, `request`, `response` và `mapper`.
- Giữ controller gọn; đặt nghiệp vụ trong service và logic truy cập dữ liệu trong repository.
- Sử dụng request/response DTO tại biên API, không trả entity trực tiếp.
- Với MapStruct, phải khai báo map hoặc ignore rõ ràng các trường do entity quản lý để không phát sinh cảnh báo unmapped target.
- Không thay đổi ID, quan hệ, trường audit và thời điểm trong vòng đời đối tượng nếu nghiệp vụ không yêu cầu.
- Sử dụng Bean Validation để kiểm tra request và tuân theo cách xử lý exception hiện có.
- Thêm hoặc cập nhật test khi thay đổi hành vi nghiệp vụ và dự án đã có tầng test phù hợp.

### Kiểm tra backend

```bash
cd backend/ailms
./mvnw test
```

Chỉ kiểm tra biên dịch:

```bash
cd backend/ailms
./mvnw -DskipTests compile
```

## Quy ước frontend

- Chạy các lệnh npm từ thư mục `frontend/ailms-frontend`.
- Giữ kiểu dữ liệu TypeScript đồng bộ với request và response của backend.
- Tái sử dụng API client, component dùng chung, utility và layout hiện có.
- Page component chủ yếu dùng để kết hợp các thành phần; tách logic UI phức tạp hoặc có thể tái sử dụng thành component/hook.
- Khi chỉnh sửa màn hình lấy dữ liệu, phải xử lý các trạng thái loading, dữ liệu rỗng, lỗi và phân quyền.
- Tránh thay đổi định dạng trên diện rộng và không chỉnh sửa kết quả build được sinh tự động.
- ID trên fe dùng định dạng string. 
- Sử dụng thư viện tailwindCss, shadcn. Áp dụng bộ màu đã thiết lập trong cấu hình tailwindcss. (file index.css) 

### Kiểm tra frontend

## Thay đổi database và API

- Xem schema và script dữ liệu là hợp đồng dùng chung giữa backend, frontend và môi trường cục bộ.
- Khi có thể, thay đổi schema phải tương thích ngược và cần có script migration nếu ảnh hưởng đến dữ liệu hiện tại.
- Khi thay đổi hợp đồng API, phải cập nhật đồng bộ DTO backend, API/type frontend và tài liệu liên quan.
- Không đưa thông tin đăng nhập, token hoặc dữ liệu production vào mã nguồn hay dữ liệu mẫu.

## Kiểm tra và bàn giao

- Chạy kiểm tra đúng phạm vi trước, sau đó chạy build toàn bộ subsystem nếu có thể.
- Chạy `git diff --check` và xem lại diff cuối cùng trước khi hoàn thành.
- Báo cáo rõ nội dung đã thay đổi, kiểm tra nào đã thành công và kiểm tra nào chưa thể chạy.
- Không thông báo hoàn thành nếu biên dịch hoặc test vẫn lỗi; cần mô tả rõ lỗi còn lại.
