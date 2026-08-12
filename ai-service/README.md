# AILMS AI Service

FastAPI service nội bộ cung cấp Gemini, RAG và long-term memory cho backend AILMS. Frontend không gọi trực tiếp service này và mọi endpoint nghiệp vụ đều yêu cầu `X-Internal-Token`.

Tài liệu giải thích chi tiết luồng hoạt động: [RAG_MEMORY_HOW_IT_WORKS.md](RAG_MEMORY_HOW_IT_WORKS.md).

## Thành phần hiện có

- Gemini provider: generate text và chat SSE; model mặc định `gemini-3.5-flash-lite`.
- Extractor mở rộng qua `BaseExtractor`: text/Markdown, PDF có OCR fallback, DOCX và ảnh PNG/JPEG.
- Chunker bảo toàn metadata trang PDF và heading DOCX.
- Gemini Embedding 2 qua `BaseEmbedder`; hỗ trợ text và vector multimodal ảnh/PDF.
- Qdrant qua `BaseVectorStore`, tách collection `management_knowledge` và `long_term_memory`.
- Ingestion đồng bộ: extract → chunk → embed → xóa vector cũ → upsert.
- Semantic retrieval có payload filter do backend truyền xuống.
- Long-term memory được scope bắt buộc theo `ownerId`.

PDF scan và ảnh được OCR bằng Gemini Vision. Video extractor thuộc phase tiếp theo và có thể đăng ký thêm trong `ExtractorFactory` mà không đổi ingestion pipeline.

## API nội bộ

- `GET /test/health`: health check, không yêu cầu token.
- `POST /test/generate`: kiểm tra sinh text với Gemini.
- `POST /chat/stream`: chat SSE toàn hệ thống có query rewriting, RAG và role filter.
- `POST /chat/title`: tạo tiêu đề một dòng cho hội thoại mới.
- `POST /rag/ingest`: ingest `text`, `pdf`, `docx`, `image`; bắt buộc có `domain` và `allowedRoles`.
- `POST /rag/search`: semantic search với `roles` bắt buộc và Qdrant `MatchAny`.
- `PUT /memory/{ownerId}/{memoryId}`: ghi long-term memory theo owner và scope.
- `POST /memory/recall`: semantic recall theo owner và scope.
- `DELETE /memory/{ownerId}?scope=...&memory_id=...`: xóa memory trong một scope.

`/rag/ingest` nhận các ID dưới dạng string. `sourceId` là định danh ổn định của tài liệu; ingest lại cùng ID sẽ thay vector cũ, tránh dữ liệu trùng. `allowedRoles` không có giá trị mặc định để ingestion luôn fail-closed khi backend quên khai báo quyền.

Với dữ liệu nghiệp vụ, client không tự tạo `sourceId`. Backend dùng Snowflake ID của entity MySQL làm `sourceId` và phát sự kiện `AFTER_COMMIT` để chủ động ingest. Ví dụ hợp đồng `345050865599516672` trong MySQL dùng chính chuỗi này trong Qdrant; cập nhật sẽ upsert cùng nguồn, xóa hợp đồng sẽ gọi `DELETE /rag/sources/{sourceId}`. Hợp đồng có PDF/DOCX được tải từ MinIO và gửi base64 sang extractor; PDF scan được OCR trước khi chunk và embedding. Hợp đồng chưa có file dùng dữ liệu text từ MySQL làm fallback.

## Admin/HR hỏi dữ liệu hệ thống

Đã implement Gemini function calling cho chat của `ROLE_ADMIN` và `ROLE_HR`. Gemini chỉ chọn tool; dữ liệu luôn được Backend kiểm tra quyền, truy vấn MySQL và rút gọn field trước khi gửi lại AI Service để diễn giải. AI Service không có kết nối trực tiếp tới MySQL.

Các tool hiện có là `get_system_overview`, `search_employees`, `get_employee_contracts`, `search_students` và `get_student_learning_summary`. Chúng chỉ đọc dữ liệu, giới hạn tối đa 20 kết quả và không gửi lương, email, số điện thoại hoặc file hợp đồng sang Gemini. Mỗi tool call có audit metadata ở Backend.

Gọi bằng Postman vào Backend, không gọi thẳng AI Service:

```http
POST http://localhost:8080/api/v1/ai/chat/stream
Authorization: Bearer <JWT của Admin hoặc HR>
Content-Type: application/json
Accept: text/event-stream

{
  "question": "Hợp đồng của nhân viên có mã EMP001 còn hạn không?",
  "module": "HR",
  "route": "/admin/contracts"
}
```

Ví dụ câu hỏi:

- `Hệ thống hiện có bao nhiêu nhân viên, học viên và hợp đồng?`
- `Tìm nhân viên Nguyễn Văn A.`
- `Hợp đồng của nhân viên EMP001 có hiệu lực đến ngày nào?`
- `Tìm học viên có mã HV001.`
- `Tiến độ học tập của học viên HV001 như thế nào?`

Thông tin công ty hiện chưa có entity/bảng cấu hình tập trung. Tool tổng quan sẽ nói rõ trạng thái này, thay vì sử dụng các giá trị mẫu trong template hợp đồng như dữ liệu thật.

## Chạy local

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Các biến môi trường chính:

```dotenv
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
INTERNAL_SECRET=...
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
BACKEND_INTERNAL_BASE_URL=http://localhost:8080
```

`BACKEND_INTERNAL_BASE_URL` phải phù hợp với nơi **AI Service đang chạy**, không phải nơi trình duyệt đang chạy:

- Chạy Backend và AI Service trực tiếp trên máy: `http://localhost:8080`.
- Chạy toàn bộ bằng Docker Compose: `http://backend:8080` (Compose đã cấu hình sẵn).
- Chạy AI Service Docker nhưng Backend local: `http://host.docker.internal:8080`. Compose đã thêm mapping `host-gateway` cho Linux.

## Test Backend local + AI Service Docker

AI Service chỉ bind vào `127.0.0.1:8000`, nên không public ra mạng và FE vẫn chỉ gọi Backend.

```bash
# Terminal 1: AI + Qdrant bằng Docker, Backend dùng process local ở port 8080.
BACKEND_INTERNAL_BASE_URL=http://host.docker.internal:8080 docker compose up --build ai-service qdrant

# Terminal 2: Backend local gọi AI Docker qua loopback.
cd backend/ailms
AI_SERVICE_BASE_URL=http://127.0.0.1:8000 \
AI_SERVICE_INTERNAL_TOKEN=dev_internal_secret_123 \
./mvnw spring-boot:run
```

`AI_SERVICE_INTERNAL_TOKEN` phải đúng bằng `AI_INTERNAL_SECRET` được truyền vào container. Nếu `.env` thay secret mặc định thì dùng giá trị đó ở cả hai lệnh.

## Kiểm tra

```bash
pytest
```

Unit test dùng dependency giả cục bộ cho embedding/vector store, không gọi Gemini hay Qdrant thật.
