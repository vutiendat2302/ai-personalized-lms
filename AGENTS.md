# AGENTS.md

## Tổng quan dự án

AI Personalized LMS là hệ thống quản lý học tập gồm các thành phần:

- `backend/ailms`: Backend Spring Boot sử dụng Java 25, Maven, JPA, MapStruct và MySQL.
- `frontend/ailms-frontend`: Frontend sử dụng React 19, TypeScript, Vite và Tailwind CSS.
- `ai-service`: Service AI riêng biệt sử dụng Python 3.12 và FastAPI, đảm nhiệm Prompt Engine, tích hợp AI Provider (Gemini), RAG Engine, Embedding và Vector Database (Qdrant). Không truy cập trực tiếp MySQL nghiệp vụ; chỉ giao tiếp nội bộ với `backend/ailms`.
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
- Mọi lời gọi sang `ai-service` phải đi qua 1 client dùng chung (ví dụ `AiServiceClient`), không gọi rải rác từ nhiều nơi; luôn gửi kèm header xác thực nội bộ và không log nội dung nhạy cảm của request/response AI.

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
- FE không bao giờ gọi trực tiếp `ai-service`; mọi tính năng AI (sinh nội dung, chat, v.v.) đều gọi qua API của `backend/ailms` như các tính năng khác.

### Kiểm tra frontend

## Quy ước ai-service

- Chạy các lệnh Python từ thư mục `ai-service`, trong virtual environment riêng (`.venv`), không cài package vào Python hệ thống.
- Tuân theo cấu trúc thư mục hiện có: `providers`, `prompt_builder`, `optimizer`, `rag` (gồm `extractors`, `chunker`, `embedder`, `retriever`, `ingestion_pipeline`), `vector_store`, `routers`, `schemas`, `core`.
- Provider AI phải implement theo interface chung `base_provider.py`; không gọi thẳng SDK của Gemini (hoặc provider khác) từ router hay service ngoài lớp `providers`.
- Định nghĩa schema request/response bằng Pydantic tại `schemas/`, đặc biệt với các endpoint yêu cầu structured output (quiz, rubric); không trả JSON tự do không có schema.
- Toàn bộ endpoint expose cho `backend/ailms` phải xác thực bằng header nội bộ (`X-Internal-Token`); không expose endpoint ra ngoài docker network, không nhận traffic trực tiếp từ FE.
- Không log nội dung prompt/response chứa dữ liệu nhạy cảm hoặc thông tin cá nhân học viên; log usage (token, latency, cached) theo đúng schema đã thống nhất trong `ai_usage_log`/`ingestion_log`.
- Ingestion (`/rag/ingest`) giữ xử lý đồng bộ theo thiết kế hiện tại; nếu cần đổi sang bất đồng bộ (job/callback), phải cập nhật tài liệu thiết kế liên quan trước khi triển khai.
- Giới hạn ingest video tối đa 60 phút; validate độ dài trước khi xử lý, trả lỗi rõ ràng nếu vượt giới hạn.
- Không thêm provider mới (Groq, OpenRouter, v.v.) hoặc đổi model đang dùng nếu không có yêu cầu rõ ràng; khi thêm, phải theo đúng interface `base_provider.py` sẵn có.
- Format code bằng `black`, kiểm tra kiểu dữ liệu bằng `mypy` nếu dự án đã cấu hình; giữ type hint đầy đủ cho function public.
- Không commit API key (`GEMINI_API_KEY`, `INTERNAL_SECRET`, v.v.) vào source; chỉ đọc từ ENV qua `core/config.py`.

### Kiểm tra ai-service

```bash
cd ai-service
pytest
```

Chỉ kiểm tra kiểu dữ liệu (nếu có cấu hình mypy):

```bash
cd ai-service
mypy app
```

## Thay đổi database và API

- Xem schema và script dữ liệu là hợp đồng dùng chung giữa backend, frontend và môi trường cục bộ.
- Khi có thể, thay đổi schema phải tương thích ngược và cần có script migration nếu ảnh hưởng đến dữ liệu hiện tại.
- Khi thay đổi hợp đồng API, phải cập nhật đồng bộ DTO backend, API/type frontend và tài liệu liên quan.
- Khi thay đổi hợp đồng API giữa `backend/ailms` và `ai-service` (request/response của `/generate/*`, `/chat/stream`, `/rag/ingest`), phải cập nhật đồng bộ DTO backend, schema Pydantic phía `ai-service` và tài liệu thiết kế AI liên quan.
- Không đưa thông tin đăng nhập, token hoặc dữ liệu production vào mã nguồn hay dữ liệu mẫu.

## Kiểm tra và bàn giao

- Chạy kiểm tra đúng phạm vi trước, sau đó chạy build toàn bộ subsystem nếu có thể.
- Chạy `git diff --check` và xem lại diff cuối cùng trước khi hoàn thành.
- Báo cáo rõ nội dung đã thay đổi, kiểm tra nào đã thành công và kiểm tra nào chưa thể chạy.
- Không thông báo hoàn thành nếu biên dịch hoặc test vẫn lỗi; cần mô tả rõ lỗi còn lại.