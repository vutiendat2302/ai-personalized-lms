# 🤖 AILMS AI Service — Intelligent Engine & RAG Microservice

<div align="center">

![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google GenAI](https://img.shields.io/badge/Google_Gemini-3.5_Flash-8E75C2?style=for-the-badge&logo=google&logoColor=white)
![Gemini Embedding 2](https://img.shields.io/badge/Embedding-Gemini_Embedding_2-blue?style=for-the-badge&logo=google&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB_768d-DC2626?style=for-the-badge&logo=qdrant&logoColor=white)
![Sentence Transformers](https://img.shields.io/badge/Local_Embedding-Sentence_Transformers-FF6F00?style=for-the-badge&logo=huggingface&logoColor=white)
![Pydantic v2](https://img.shields.io/badge/Pydantic-v2.x-E92063?style=for-the-badge&logo=pydantic&logoColor=white)

<p align="center">
  <b>Microservice Trí tuệ Nhân tạo Độc lập Cung cấp Trợ lý AI, RAG Đa định dạng, Bộ nhớ Dài hạn và Truy vấn Nghiệp vụ Phân quyền</b>
  <br />
  <i>Enterprise AI Microservice powering Real-time SSE Chat Streaming, Multi-modal RAG (PDF/DOCX/OCR), Long-Term Memory, and Safe Function Calling.</i>
</p>

</div>

---

## 1. Kiến trúc Tổng thể & Nguyên lý Zero-Trust

`ai-service` được xây dựng như một **Microservice độc lập** phục vụ riêng cho Backend Spring Boot. Service áp dụng mô hình bảo mật **Zero-Trust & Data Isolation**:
- **Không công khai ra Internet:** Chỉ lắng nghe trên mạng nội bộ Docker (`ailms-network`) hoặc bind `127.0.0.1:8000` trên môi trường phát triển cục bộ.
- **Không truy cập trực tiếp MySQL nghiệp vụ:** Ngăn ngừa nguy cơ rò rỉ dữ liệu nhạy cảm (lương, mật khẩu, thông tin cá nhân). Dữ liệu nghiệp vụ chỉ được cấp phát theo ngữ cảnh an toàn từ Backend qua cơ chế Tool Calling.
- **Xác thực Token Nội bộ Bắt buộc:** Mọi endpoint (trừ `/test/health`) đều yêu cầu header `X-Internal-Token` khớp với `AI_INTERNAL_SECRET`.
- **Chuẩn hóa Định danh Dạng String:** Tất cả ID (Snowflake ID, Course ID, User ID) truyền qua biên API đều ở dạng `string` để bảo toàn độ chính xác 64-bit.

```mermaid
flowchart TD
    subgraph ClientAndGateway ["Client & API Gateway"]
        FE["Frontend (React 19 SPA)"]
        BE["Spring Boot Backend Core (Port 8080)"]
    end

    subgraph AIServiceCore ["AI Service Architecture (FastAPI Python 3.12)"]
        AuthMiddleware["Security Dependency (Verify X-Internal-Token)"]

        subgraph CoreRouters ["FastAPI Routers"]
            ChatRouter["/chat (SSE Streaming & Support Answers)"]
            RAGRouter["/rag (Multi-Modal Ingest & Semantic Search)"]
            MemoryRouter["/memory (Scoped Long-Term Memory)"]
            CatalogRouter["/catalog (Local Embedding Search)"]
        end

        subgraph EngineLayer ["Core AI Processing Engines"]
            QueryRewriter["Query Rewriter & Intent Classifier"]
            ContextBuilder["Dynamic Context Builder & Sanitizer"]
            RAGPipeline["RAG Ingestion Pipeline"]
            ToolRegistry["Gemini Tool Calling / Function Registry"]
        end

        subgraph ProviderLayer ["AI Providers & Embedders"]
            GeminiLLM["GeminiProvider (gemini-3.5-flash-lite / Flash)"]
            GeminiEmbedder["GeminiEmbedder (gemini-embedding-2: 768d)"]
            LocalEmbedder["LocalCatalogEmbedder (sentence-transformers)"]
        end
    end

    subgraph VectorDB ["Qdrant Vector Database (Port 6333)"]
        ColKnowledge[("management_knowledge<br/>(Tri thức quản trị & Học liệu)")]
        ColMemory[("long_term_memory<br/>(Ký ức người dùng theo ownerId)")]
        ColCatalog[("public_catalog_local_*<br/>(Danh mục công khai)")]
    end

    FE -->|Chỉ gọi Backend API /api/v1/*| BE
    BE -->|HTTP POST + Header X-Internal-Token| AuthMiddleware
    AuthMiddleware --> CoreRouters

    ChatRouter --> QueryRewriter --> ContextBuilder
    ContextBuilder <--> ToolRegistry
    ContextBuilder --> GeminiLLM

    RAGRouter --> RAGPipeline
    RAGPipeline --> GeminiEmbedder --> ColKnowledge

    MemoryRouter --> GeminiEmbedder --> ColMemory
    CatalogRouter --> LocalEmbedder --> ColCatalog

    ToolRegistry -.->|Callback an toàn lấy dữ liệu| BE
```

---

## 2. AI Chat Streaming Thời gian thực & Tool Calling (SSE)

### 2.1 Luồng Xử lý Trò chuyện Dạng dòng (Server-Sent Events)

Endpoint `/chat/stream` tiếp nhận yêu cầu từ Backend và sinh phản hồi dạng dòng theo chuẩn SSE:
- **`event: token`**: Gửi từng phần phản hồi (`{"delta": "..."}`) ngay khi LLM sinh token, tạo hiệu ứng gõ chữ mượt mà.
- **`event: error`**: Truyền tải thông báo lỗi có cấu trúc khi gặp sự cố mạng hoặc vượt quota.
- **`event: done`**: Kết thúc phiên truyền tải kèm metadata đo lường (`usage: {prompt_tokens, completion_tokens, latency_ms}`).

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng / Admin
    participant FE as Frontend Client
    participant BE as Spring Boot Backend
    participant AI as AI Service (/chat/stream)
    participant Qdrant as Qdrant Vector Store
    participant Gemini as Google Gemini 3.5 Flash

    User->>FE: Đặt câu hỏi trên giao diện
    FE->>BE: POST /api/v1/ai/chat/stream
    BE->>BE: Xác thực quyền (JWT) & Trích xuất User Context (Role, User ID)
    BE->>AI: POST /chat/stream (Kèm question, context, allowedRoles, history)

    AI->>AI: Query Rewriting (Tối ưu hóa câu truy vấn độc lập ngữ cảnh)

    alt Yêu cầu Tri thức / Học liệu (RAG Search)
        AI->>Qdrant: Vector Search (collection: management_knowledge, Filter: allowedRoles)
        Qdrant-->>AI: Top-K Document Chunks
    else Yêu cầu Dữ liệu Quản trị (Admin Tool Calling)
        AI->>Gemini: Phân tích Ý định & Chọn Tool
        Gemini-->>AI: Call Function: search_employees / get_student_learning_summary
        AI->>BE: Callback nội bộ lấy dữ liệu (Backend lọc sạch trường nhạy cảm: Lương, SĐT, Mật khẩu)
        BE-->>AI: Dữ liệu nghiệp vụ an toàn (JSON)
    end

    AI->>Gemini: Stream Chat với Dynamic Grounded Context
    loop Server-Sent Events (SSE Stream)
        Gemini-->>AI: Stream Chunks
        AI-->>BE: event: token | data: {"delta": "..."}
        BE-->>FE: Stream Chunk về Trình duyệt
        FE-->>User: Markdown Render thời gian thực (Typing Effect)
    end
    AI-->>BE: event: done | data: {"status": "completed", "usage": {...}}
    BE->>BE: Ghi nhận Audit Log & AI Usage Metrics
```

### 2.2 Danh mục Tool Calling An toàn Phân quyền RBAC

Hệ thống cung cấp danh mục Tool nghiệp vụ nội bộ toàn diện được kiểm soát quyền chặt chẽ tại Backend Core:

| Nhóm Nghiệp vụ | Tên Tool | Vai trò được phép gọi | Phạm vi dữ liệu truy vấn & Quy tắc bảo mật |
| :--- | :--- | :--- | :--- |
| **Hệ thống** | `get_system_overview` | `ADMIN`, `HR` | Thống kê số lượng nhân viên, học viên, hợp đồng, phòng ban. |
| | `list_pending_approvals` | `ADMIN`, `HR` | Liệt kê các yêu cầu phê duyệt đang chờ xử lý. |
| **Nhân sự & Hợp đồng** | `search_employees` | `ADMIN`, `HR` | Tìm nhân sự theo tên, mã NV, phòng ban (Ẩn lương, CCCD, SĐT). |
| | `get_employee_contracts` | `ADMIN`, `HR` | Tra cứu trạng thái, ngày hiệu lực/hết hạn hợp đồng. |
| | `list_expiring_contracts` | `ADMIN`, `HR` | Liệt kê hợp đồng sắp hết hạn trong 30–180 ngày tới. |
| | `get_hr_operations_summary` | `ADMIN`, `HR` | Thống kê chấm công và đơn xin nghỉ phép trong ngày. |
| | `analyze_attendance_trend` | `ADMIN`, `HR` | Phân tích xu hướng đi muộn, vắng mặt (tối đa 90 ngày). |
| | `get_employee_leave_and_attendance_detail` | `ADMIN`, `HR` | Xem chi tiết chấm công & nghỉ phép của 1 nhân viên cụ thể. |
| | `lock_or_unlock_employee_account` | `ADMIN`, `HR` | Khóa hoặc mở khóa tài khoản nhân viên. |
| | `check_and_prepare_contract_creation` | `ADMIN`, `HR` | Kiểm tra điều kiện và chuẩn bị tạo/gia hạn hợp đồng. |
| | `create_or_renew_employee_contract` | `ADMIN`, `HR` | Tạo hoặc gia hạn hợp đồng trực tiếp qua chat. |
| **Học viên & Học vụ** | `search_students` | `ADMIN`, `TEACHER` | Tra cứu hồ sơ học viên theo mã hoặc họ tên. |
| | `get_student_learning_summary` | `ADMIN`, `TEACHER` | Thống kê tiến độ khóa học, streak và hoàn thành bài học. |
| | `get_student_detailed_learning_progress` | `ADMIN`, `TEACHER` | Xem chi tiết tiến độ từng chương, bài học, điểm thi quiz. |
| | `analyze_learning_progress` | `ADMIN`, `HR` | Phân tích tiến độ học tập toàn hệ thống theo ngưỡng rủi ro. |
| | `list_students_at_learning_risk` | `ADMIN`, `HR` | Cảnh báo danh sách học viên có nguy cơ bỏ học. |
| | `lock_or_unlock_student_account` | `ADMIN` | Khóa hoặc mở khóa tài khoản học viên. |
| **Thương mại & Doanh số** | `get_order_summary` | `ADMIN` | Tổng quan số lượng và doanh thu đơn hàng theo trạng thái. |
| | `get_sales_kpi_and_order_analytics` | `ADMIN` | Phân tích chuyên sâu KPI bán hàng, tỷ lệ chuyển đổi. |
| | `query_abandoned_carts_and_retarget` | `ADMIN` | Quét các giỏ hàng bị bỏ quên để lên kế hoạch remarketing. |
| | `draft_coupon_and_distribute` | `ADMIN` | Soạn thảo mã giảm giá và phát hành cho nhóm học viên mục tiêu. |
| **Đào tạo & Khóa học** | `get_course_catalog_summary` | `ADMIN` | Tổng quan danh mục khóa học và trạng thái phát hành. |
| | `get_course_details` | `ALL` | Xem chi tiết thông tin, giá và giảng viên của khóa học. |
| | `get_course_curriculum` | `ALL` | Xem cấu trúc chương và bài học trong khóa học. |
| | `get_lesson_summary_and_resources` | `ALL` | Tóm tắt nội dung bài học và tài liệu đính kèm. |
| **Hành động & Thông báo**| `draft_notification` | `ADMIN` | Soạn thảo thông báo hệ thống gửi học viên/giảng viên. |

---

### 2.3 Cơ chế Kiểm soát Phạm vi Nghiệp vụ (Domain Guardrail) & Tiết kiệm Token

Để ngăn ngừa lãng phí tài nguyên và chi phí gọi Gemini API, hệ thống kích hoạt bộ lọc nội dung chặt chẽ:
1. **Phạm vi Nghiệp vụ Hợp lệ:** Chỉ giải đáp và xử lý các vấn đề liên quan đến: Giáo dục, Học tập, Khóa học, Học vụ, Nhân sự, Hợp đồng, Chấm công, Doanh số, Báo cáo số liệu, Đề thi/bài tập, và Vận hành hệ thống LMS.
2. **Từ chối Tự động Đối với Nội dung Không liên quan:** Khi người dùng gửi hình ảnh hoặc tệp tài liệu hoàn toàn không thuộc phạm vi LMS (ví dụ: ảnh thú cưng, meme giải trí, đồ ăn, ảnh phong cảnh cá nhân, nội dung rác):
   * AI lập tức từ chối súc tích và lịch sự.
   * Tuyệt đối không phân tích chuyên sâu hay sinh câu trả lời vô nghĩa nhằm triệt tiêu lãng phí token.
   * Mẫu phản hồi chuẩn hóa:
     > *"Hình ảnh/tài liệu này không thuộc phạm vi đào tạo hoặc quản trị của hệ thống AILMS. Vui lòng tải lên tài liệu học tập, bài tập, biểu đồ hoặc bảng số liệu liên quan đến hệ thống."*

---

### 2.4 Quy chuẩn Trích dẫn Nguồn Tham chiếu Bắt buộc (Standard Citations)

Mọi câu trả lời có sử dụng dữ liệu từ RAG hoặc Tool Calling bắt buộc phải có khối trích dẫn ở cuối câu trả lời:

```markdown
---
📌 **Nguồn tham chiếu:**
- [Tài liệu RAG / Quy chế]: <Tên tài liệu / Mẫu quy chế>, <Trang nếu có>
- [Dữ liệu Hệ thống]: <Phân hệ (Nhân sự / Học vụ / Hợp đồng / Doanh số / Lớp học)>, <Mã đối tượng cụ thể (Mã NV, Số HĐ, Mã HV, Mã ĐH)>
```

---

### 2.5 Phân tích Đa định dạng Tệp đính kèm trong Chat (Multi-format In-Memory Extraction)

Người dùng có thể đính kèm trực tiếp tệp văn bản hoặc hình ảnh trong hội thoại:
* **Tài liệu văn bản (`PDF`, `DOCX`, `TXT`):** AI Service tự động trích xuất nội dung văn bản trong memory thông qua `PdfExtractor`, `DocxExtractor`, `TextExtractor` và đưa vào prompt ngữ cảnh mà không cần nạp vĩnh viễn vào vector database.
* **Hình ảnh (`PNG`, `JPEG`, `WEBP`):** Phân tích trực tiếp qua **Gemini Vision OCR** (bảng điểm, ảnh chụp màn hình biểu đồ, bài tập viết tay).

## 3. Đường ống RAG Ingestion Pipeline & Multi-Modal Processing

Hệ thống hỗ trợ nạp tri thức từ đa dạng định dạng tệp tin, tự động làm sạch và chuyển hóa thành Vector 768 chiều lưu trữ trên **Qdrant**:

```mermaid
flowchart LR
    Upload["Tài liệu tải lên (PDF, DOCX, TXT, PNG/JPG)"] --> ExtractorFactory["ExtractorFactory (Lựa chọn Extractor phù hợp)"]

    subgraph Extractors ["Multi-Modal Extractors"]
        TextExt["TextExtractor (Plain text / Markdown)"]
        DocxExt["DocxExtractor (Bảo toàn Heading & Cấu trúc)"]
        PdfExt["PdfExtractor (PyMuPDF trích xuất Text & Trang)"]
        VisionOCR["Gemini Vision OCR (Fallback cho PDF Scan & Ảnh)"]
    end

    ExtractorFactory --> Extractors
    Extractors --> Chunker["Contextual Chunker (Chia nhỏ 500-1000 tokens kèm Metadata)"]
    Chunker --> Embedder["Gemini Embedding 2 (768-dim Embedding Model)"]

    subgraph VectorUpsert ["Idempotent Vector Upsert"]
        DeleteOld["Xóa Vector cũ có cùng sourceId"]
        InsertNew["Upsert Vector mới (ID = sourceId + chunkIndex)"]
    end

    Embedder --> DeleteOld --> InsertNew --> QdrantCol[("Qdrant: management_knowledge")]
```

### 3.1 Cơ chế Đảm bảo Tính Nhất quán (Idempotent Ingestion)
- **`sourceId` ổn định:** Mỗi tài liệu nghiệp vụ dùng chính Snowflake ID từ MySQL làm `sourceId`.
- **Cơ chế Re-ingest an toàn:** Khi tài liệu được cập nhật hoặc chỉnh sửa, pipeline thực hiện xóa toàn bộ các vector chunk cũ có cùng `sourceId` trước khi ghi dữ liệu mới, triệt tiêu hoàn toàn rủi ro trùng lặp ngữ cảnh.
- **Fail-Closed Security:** Trường `allowedRoles` bắt buộc phải được khai báo trong request nạp; nếu Backend bỏ trống, hệ thống lập tức từ chối để ngăn chặn rò rỉ tài liệu nội bộ.

### 3.2 Chiến lược Embedding Hai Tầng (Dual Embedding Strategy)
1. **Cloud Embeddings (`gemini-embedding-2`):** Tạo vector 768 chiều cho toàn bộ học liệu, tài liệu quy chế, chính sách và ký ức dài hạn.
2. **Local Embeddings (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`):** Chạy trực tiếp trên CPU container để lập chỉ mục và gợi ý danh mục khóa học công khai (`public_catalog_*`), xử lý batch lên tới 500 bản ghi với chi phí 0đ và không phụ thuộc kết nối Internet ngoài.

---

## 4. Bộ nhớ Dài hạn & Phân vùng Vector (Long-Term Memory)

Hệ thống phân tách không gian vector thành 3 Collection độc lập trong Qdrant để đảm bảo an toàn dữ liệu:

| Tên Collection | Chiều Vector | Mô tả dữ liệu lưu trữ | Cơ chế phân quyền & Filter |
| :--- | :---: | :--- | :--- |
| **`management_knowledge`** | 768 | Tài liệu quy chế doanh nghiệp, chính sách đào tạo, nội dung bài học | Payload filter bắt buộc theo danh sách vai trò (`allowedRoles`) |
| **`long_term_memory`** | 768 | Ký ức hội thoại, sở thích học tập, thói quen của từng người dùng | Bắt buộc gán nhãn theo `ownerId` và `scope` (ví dụ `student_study_habits`) |
| **`public_catalog_local_*`** | 384 | Tên khóa học, danh mục, mô tả ngắn phục vụ tìm kiếm ngữ nghĩa công khai | Công khai (Public), không yêu cầu xác thực người dùng |

---

## 5. Danh mục API Nội bộ (Internal API Endpoints)

Tất cả các endpoint dưới đây đều yêu cầu Header: `X-Internal-Token: <AI_INTERNAL_SECRET>` *(ngoại trừ endpoint `/test/health`)*.

```http
# 1. Health Check
GET /test/health

# 2. Test Sinh Văn Bản
POST /test/generate
Content-Type: application/json
{
  "prompt": "Giải thích ngắn gọn khái niệm OOP trong Java."
}

# 3. AI Chat Streaming (Server-Sent Events)
POST /chat/stream
Content-Type: application/json
Accept: text/event-stream
{
  "question": "Quy định về thời gian thử việc của nhân viên như thế nào?",
  "conversationId": "345050865599516672",
  "allowedRoles": ["ROLE_ADMIN", "ROLE_HR"]
}

# 4. Sinh Tiêu Đề Cuộc Trò Chuyện (Tự động tóm tắt 1 dòng)
POST /chat/title
Content-Type: application/json
{
  "firstMessage": "Hướng dẫn tôi cách làm bài thi trắc nghiệm Java nâng cao"
}

# 5. Phản Hồi Nhanh Hỗ Trợ Công Khai (Public Support Quick Answer)
POST /chat/support-answer
Content-Type: application/json
{
  "question": "Làm thế nào để đăng ký khóa học 1 kèm 1?",
  "visitorId": "visitor-uuid-123"
}

# 6. Nạp Tri Thức RAG (Multi-Modal Ingestion)
POST /rag/ingest
Content-Type: application/json
{
  "sourceId": "lesson-345050865599516672",
  "sourceType": "pdf",
  "fileBase64": "JVBERi0xLjQK...",
  "domain": "COURSE_CONTENT",
  "allowedRoles": ["ROLE_STUDENT", "ROLE_TEACHER"],
  "metadata": {"courseId": "1001", "lessonId": "2002"}
}

# 7. Tìm Kiếm Ngữ Nghĩa RAG (Semantic Search Only)
POST /rag/search
Content-Type: application/json
{
  "query": "Điều kiện để được cấp chứng chỉ hoàn thành khóa học",
  "roles": ["ROLE_STUDENT"],
  "limit": 5
}

# 8. Ghi Ký Ức Dài Hạn (Upsert Long-term Memory)
PUT /memory/{ownerId}/{memoryId}
Content-Type: application/json
{
  "content": "Học viên thường học bài hiệu quả vào khung giờ 20h - 22h tối",
  "scope": "STUDENT_PREFERENCES"
}

# 9. Truy Hồi Ký Ức Dài Hạn (Recall Long-term Memory)
POST /memory/recall
Content-Type: application/json
{
  "ownerId": "student-123456",
  "query": "thời gian học yêu thích",
  "scope": "STUDENT_PREFERENCES",
  "limit": 3
}

# 10. Tìm Kiếm Ngữ Nghĩa Danh Mục Công Khai (Local Embedding)
POST /catalog/search
Content-Type: application/json
{
  "query": "Lập trình web với Spring Boot và React",
  "entity_type": "course",
  "limit": 10
}
```

---

## 6. Lộ trình Phát triển Nâng cấp Dựa trên Hệ thống Hiện có (Future Roadmap)

Kiến trúc hiện tại của `ai-service` được thiết kế theo tính module hóa cao, sẵn sàng mở rộng các tính năng thông minh thế hệ tiếp theo:

```mermaid
flowchart TD
    Current["Hạ tầng Đang Vận hành Hiện tại (FastAPI + Gemini 3.5 + Qdrant + RAG + Tool Calling)"]

    subgraph Phase1 ["Phase 1: Video Ingestion & Timestamp Search"]
        P1_Video["VideoExtractor (< 60 phút)"]
        P1_Audio["Whisper / Gemini Audio Transcription"]
        P1_Time["Timestamp Vector Chunking (Tìm kiếm chính xác đoạn phát video)"]
    end

    subgraph Phase2 ["Phase 2: Agentic Autonomous Tutoring & Multi-Agent Grading"]
        P2_Tutor["AI Autonomous Tutor (Phát hiện lỗ hổng kiến thức qua Quiz Answer)"]
        P2_Grading["Multi-Agent Auto-Grading (Chấm bài tập tự luận đối chiếu Rubric)"]
        P2_Quiz["Automated Quiz & Coding Exercise Generator (Sinh đề thi chuẩn Bloom's Taxonomy)"]
    end

    subgraph Phase3 ["Phase 3: Deep Personalization & Recommendation Engine"]
        P3_Mining["Behavioral Mining trên learning_activity_log"]
        P3_Graph["Tri thức Khóa học Dạng Đồ thị (Knowledge Graph)"]
        P3_Path["Dynamic Learning Path Generator (Tự động đề xuất bài học tiếp theo)"]
    end

    subgraph Phase4 ["Phase 4: High-Performance Caching & Hybrid Retrieval"]
        P4_RRF["Hybrid Search (Dense Vector Qdrant + Sparse BM25 Meilisearch)"]
        P4_Cache["Semantic Vector Caching trên Redis (Giảm 70% chi phí gọi Gemini)"]
    end

    Current --> Phase1
    Phase1 --> Phase2
    Phase2 --> Phase3
    Phase3 --> Phase4
```

1. **Phase 1 — Video RAG & Timestamp Indexing:** Đăng ký thêm `VideoExtractor` vào `ExtractorFactory` để trích xuất transcript từ video bài giảng, gắn nhãn mốc thời gian (timestamp) giúp học viên tìm kiếm và nhảy thẳng tới đoạn video giải thích kiến thức.
2. **Phase 2 — Multi-Agent Auto-Grading:** Xây dựng hệ thống đa tác tử (Multi-Agent): Tác tử chấm điểm sơ bộ, Tác tử đối chiếu barem điểm (Rubric), Tác tử tổng hợp phản hồi và góp ý chi tiết cho học viên.
3. **Phase 3 — Khai phá Hành vi & Lộ trình Tự thích ứng:** Khai phá dữ liệu chuỗi sự kiện từ bảng `learning_activity_log` để xây dựng ma trận gợi ý bài học cá nhân hóa theo tốc độ tiếp thu của từng học viên.
4. **Phase 4 — Hybrid Retrieval & Semantic Caching:** Kết hợp kết quả tìm kiếm ngữ nghĩa từ Qdrant với tìm kiếm từ khóa chính xác từ Meilisearch (Reciprocal Rank Fusion - RRF); bổ sung tầng Cache ngữ nghĩa trên Redis để tái sử dụng câu trả lời cho các câu hỏi trùng lặp.

---

## 7. Hướng dẫn Khởi chạy & Kiểm thử Cục bộ (Local Setup & Pytest)

### 1. Cấu hình Môi trường
Tạo và kích hoạt môi trường ảo Python 3.12:
```bash
cd ai-service

# Tạo Virtual Environment
python3 -m venv .venv
source .venv/bin/activate  # Trên Windows: .venv\Scripts\activate

# Cài đặt thư viện phụ thuộc
pip install -r requirements.txt
```

### 2. Cấu hình Biến Môi trường (`.env`)
Tạo file `.env` trong thư mục `ai-service/` hoặc sử dụng biến môi trường do Docker Compose cung cấp:
```dotenv
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
INTERNAL_SECRET=dev_internal_secret_123
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
BACKEND_INTERNAL_BASE_URL=http://localhost:8080
```

### 3. Khởi chạy Máy chủ Phát triển (Development Server)
```bash
uvicorn app.main:app --reload --port 8000
```
*Tài liệu Swagger UI tương tác sẽ khả dụng tại `http://localhost:8000/docs`.*

### 4. Thực thi Kiểm thử Tự động (Automated Unit & Integration Tests)
```bash
# Chạy toàn bộ test suites với pytest
pytest

# Chạy kiểm thử chi tiết và xuất báo cáo
pytest -v
```

---

<div align="center">
  <sub>Kiến trúc Microservice AI của Hệ sinh thái <b>AI Personalized LMS</b> — Thiết kế và phát triển bởi <b>Vũ Tiến Đạt</b>.</sub>
</div>
