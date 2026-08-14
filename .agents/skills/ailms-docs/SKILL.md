---
name: ailms-docs
description: Tạo, cập nhật và duy trì tài liệu Markdown/Mermaid chuẩn kỹ thuật cho AILMS. Sử dụng khi chỉnh sửa README.md, backend/BACKEND.md, database/DATABASE.md, database/full.md, ai-service/README.md, frontend/ailms-frontend/README.md, docs/, tài liệu API/Postman, kiến trúc phân tầng, ERD, Flowchart, Sequence diagram, Business State Machine hoặc hướng dẫn phát triển hệ thống. Không sử dụng cho thay đổi code thuần túy không ảnh hưởng tài liệu.
---

# AILMS Documentation Standards & Guidelines

Tài liệu kỹ thuật của dự án **AI Personalized LMS** phải luôn phản ánh chính xác 100% implementation thực tế trong mã nguồn. Tuyệt đối không mô tả giả định hoặc nhầm lẫn giữa tính năng đã triển khai (**implemented**) và tính năng định hướng tương lai (**planned**).

---

## 1. Cấu trúc Tài liệu Dự án & Phân định Trách nhiệm

| Đường dẫn tài liệu | Phạm vi trách nhiệm & Nội dung phản ánh |
| :--- | :--- |
| `README.md` | Tài liệu tổng quan toàn dự án: Kiến trúc phân tán, Full-stack Tech Stack, sơ đồ luồng tổng thể, hướng dẫn khởi chạy Docker Compose, cổng dịch vụ và tài khoản seed. |
| `backend/BACKEND.md` | Tài liệu chuyên sâu Backend Spring Boot: Chi tiết nghiệp vụ từng domain (Security, RBAC, File Storage, HRM, Attendance, Payroll, Course, Class, Approval State Machine, PayPal Idempotency, Event-driven Audit Log). |
| `frontend/ailms-frontend/README.md` | Tài liệu phân hệ Frontend React 19: Kiến trúc Multi-Portal (Admin, Teacher, Student), Dynamic Workspace Switcher, Zustand Stores, React Hook Form + Zod, SSE AI Chat Streaming, Tailwind CSS & shadcn/ui. |
| `ai-service/README.md` & `RAG_MEMORY_HOW_IT_WORKS.md` | Tài liệu Microservice AI FastAPI: Provider Gemini 3.5 Flash, RAG Ingestion Pipeline (PDF/DOCX/OCR Vision), Qdrant Vector Store (768-dim), Long-term Memory, Gemini Tool Calling an toàn. |
| `database/DATABASE.md` & `database/full.md` | Tài liệu Cơ sở dữ liệu: Schema 3NF, ERD các bảng, danh sách quan hệ khóa ngoại, Snowflake ID, Versioned Migrations. |
| `docs/teacher-ta-workspace-api.md` | Đặc tả chi tiết REST API phân hệ Giảng viên & Trợ giảng. |
| `docs/server-operation-guide.md` | Hướng dẫn vận hành máy chủ, Docker Compose, Backup/Restore Database MySQL và Tailscale Funnel. |
| `docs/postman/` | Bộ hướng dẫn kiểm thử API Postman thủ công (AI Stream, Assessment, Support, Landing, PayPal Sandbox) và file JSON Collection/Environment. |

> **Nguyên tắc:** Tránh sao chép (duplicate) cùng một khối lượng thông tin lớn ở nhiều file. Mỗi tài liệu tập trung sâu vào đúng phạm vi phân hệ của mình và sử dụng liên kết (hyperlinks) để tham chiếu chéo.

---

## 2. Quy tắc Đọc và Chỉnh sửa Tài liệu Lớn

- File `backend/BACKEND.md` và `database/full.md` có dung lượng rất lớn.
- **Tuyệt đối không** đọc hoặc ghi đè (rewrite) toàn bộ file khi chỉ thực hiện thay đổi nhỏ cục bộ.
- Sử dụng công cụ tìm kiếm theo tiêu đề trước:
  ```bash
  rg -n "^## |^### " backend/BACKEND.md
  ```
- Chỉ đọc chính xác module/section liên quan và sử dụng `replace_file_content` hoặc `multi_replace_file_content` để chỉnh sửa đúng phạm vi.

---

## 3. Quy chuẩn Định dạng Markdown & Đặt tên Tệp

1. **Chuẩn đặt tên tệp trong `docs/`:**
   - Sử dụng định dạng chữ thường nối bằng dấu gạch ngang (**`kebab-case`**), ví dụ: `ai-admin-hr-query-testing.md`, `server-operation-guide.md`.
2. **Cấu trúc phân cấp tiêu đề (Heading Hierarchy):**
   - Tiêu đề cấp 1 (`#`) duy nhất ở đầu file.
   - Tuân thủ thứ tự `##`, `###`, `####`, không nhảy cóc cấp độ.
3. **Trình bày nội dung có cấu trúc:**
   - Dùng **Bullet list (`-`)** cho quy tắc, điều kiện, checklist.
   - Dùng **Numbered list (`1. 2. 3.`)** cho quy trình, luồng tuần tự (workflow).
   - Dùng **Markdown Table** cho danh sách API endpoint, tham số DTO, mã lỗi HTTP, hoặc so sánh cấu hình.
   - Dùng **Fenced code block** (` ```json `, ` ```http `, ` ```bash `, ` ```ts `) kèm định danh ngôn ngữ rõ ràng.
4. **Bảo mật thông tin:**
   - Tuyệt đối **không đưa API Key thật, Secret Key, Token production, Mật khẩu cá nhân** vào bất kỳ tài liệu nào. Chỉ sử dụng placeholder (ví dụ: `your_gemini_api_key_here`, `{{baseUrl}}`, `{{adminToken}}`).

---

## 4. Chuẩn mực Thiết kế Sơ đồ Mermaid

Tất cả sơ đồ kiến trúc và luồng nghiệp vụ phải được vẽ bằng **Mermaid**:

| Loại sơ đồ | Ngữ cảnh sử dụng |
| :--- | :--- |
| `flowchart TD` / `flowchart LR` | Kiến trúc hệ thống, đường ống xử lý dữ liệu (RAG Ingestion), phân luồng rẽ nhánh điều kiện. |
| `sequenceDiagram` | Tương tác giao tiếp giữa các thành phần (Client -> Backend -> AI Service -> Database), luồng xác thực JWT, thanh toán PayPal. |
| `erDiagram` | Mô hình dữ liệu quan hệ thực thể (Database Schema, RBAC entities, Audit Log). |
| `stateDiagram-v2` | Máy trạng thái vòng đời nghiệp vụ (Approval Workflow, Order Status, Contract Status). |
| `classDiagram` | Cấu trúc quan hệ Class / Interface (chỉ dùng khi giải thích các GoF Design Patterns như Strategy, Facade). |

### Lưu ý cú pháp Mermaid:
- Bọc nhãn node chứa ký tự đặc biệt trong dấu ngoặc kép: `id["Label (Chi tiết)"]`.
- Không sử dụng các thẻ HTML thô trong nhãn node để tránh lỗi render.
- Luôn cập nhật sơ đồ Mermaid tương ứng ngay khi workflow hoặc API contract thay đổi.

---

## 5. Nguyên tắc Source of Truth (Tính Xác thực Dữ liệu)

1. **Mã nguồn và cấu hình thực tế có ưu tiên cao nhất.** Nếu tài liệu cũ mâu thuẫn với mã nguồn hiện tại, hãy kiểm tra mã nguồn trước và cập nhật lại tài liệu cho đúng với mã nguồn.
2. **Trạng thái triển khai hiện tại của hệ sinh thái AILMS:**
   - **Backend:** Java 25, Spring Boot 3/4, Spring Security 6, JWT + Redis Blacklist, Snowflake ID, Event-driven Audit Log, MinIO S3 Presigned URLs, Meilisearch Full-text & Fallback JPA Specification, Approval Workflow, PayPal Sandbox Idempotent.
   - **AI Microservice:** Python 3.12, FastAPI, Gemini 3.5 Flash, Gemini Embedding 2, RAG Ingestion Pipeline (PDF/DOCX/OCR Vision), Qdrant Vector Store 768-dim, Long-term Memory, Gemini Tool Calling.
   - **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Multi-Portal Workspace Switcher, SSE Real-time Chat Streaming.
   - **Hạ tầng:** Docker Compose 7 services (MySQL 8.4, Redis 7, Meilisearch v1.15, Qdrant v1.15, MinIO, AI Service, Backend, Frontend).

---

## 6. Danh mục Kiểm tra trước khi Bàn giao Tài liệu (Docs Review Checklist)

Trước khi hoàn tất việc chỉnh sửa tài liệu, kiểm tra lần lượt:
- [ ] Đường dẫn tệp và tên class/method có tồn tại chính xác trong mã nguồn không?
- [ ] Các Endpoint URL, HTTP Method và Request/Response DTO có khớp với Controller không?
- [ ] Sơ đồ Mermaid có hiển thị đúng cú pháp và phản ánh đúng luồng xử lý không?
- [ ] Không có secret, password hoặc API key nhạy cảm bị rò rỉ.
- [ ] Các liên kết nội bộ (hyperlinks) giữa các file tài liệu có hoạt động chính xác không?
- [ ] Các lệnh `bash` hướng dẫn chạy thử nghiệm / build có thể copy-paste và thực thi thành công không?