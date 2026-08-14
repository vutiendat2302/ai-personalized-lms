---
name: ailms-ai-service
description: Phát triển, sửa lỗi, refactor, review và kiểm thử AI Microservice tại ai-service sử dụng Python 3.12, FastAPI, Pydantic v2, Google GenAI SDK (Gemini 3.5 Flash / Flash Lite), Gemini Embedding 2, Sentence-Transformers, RAG Ingestion Pipeline (PDF/DOCX/OCR Vision), Qdrant Vector Database (768-dim), Long-Term Memory, Gemini Tool Calling an toàn, và Server-Sent Events (SSE) Chat Streaming. Sử dụng khi làm provider, embedding, vector store, chunker, extractor, chat streaming, prompt engineering, tool calling, internal authentication hoặc AI unit tests. Không sử dụng cho công việc chỉ liên quan Backend Spring Boot thông thường, Frontend React, SQL migration hoặc tài liệu-only.
---

# AILMS AI Service — Engineering Standards & Development Guide

Làm việc trong thư mục `ai-service/`.

Mã nguồn hiện tại trong `ai-service/app/` là **Source of Truth** cao nhất. Toàn bộ các thành phần hạ tầng cốt lõi (Provider, RAG Pipeline, Chunker, Multi-modal Extractors, Embedder, Qdrant Vector Store, Long-term Memory, Tool Calling, SSE Streaming) **ĐÃ ĐƯỢC TRIỂN KHAI VÀ ĐANG VẬN HÀNH THỰC TẾ**.

---

## 1. Kiến trúc Phân tầng & Trách nhiệm (Clean Layered Architecture)

```text
ai-service/
├── app/
│   ├── core/                  # Cấu hình môi trường (config.py), Logging và Security Token
│   ├── providers/             # BaseProvider & GeminiProvider (Giao tiếp Google GenAI SDK)
│   ├── rag/                   # RAG Engine:
│   │   ├── extractors/        # Multi-modal Extractors (Text, Docx, Pdf qua PyMuPDF, OCR qua Gemini Vision)
│   │   ├── chunker.py         # Contextual Chunker bảo toàn Heading & Metadata trang
│   │   ├── embedder.py        # Gemini Embedding 2 (768-dim) & Local Embeddings
│   │   ├── retriever.py       # Semantic Vector Retrieval trên Qdrant
│   │   └── ingestion_pipeline.py # Điều phối nạp tài liệu Idempotent
│   ├── vector_store/          # BaseVectorStore & QdrantStore (Quản lý Qdrant Collections)
│   ├── memory/                # Long-term Memory Service phân vùng theo ownerId/scope
│   ├── chat/                  # Query Rewriter, Context Builder, Management & Support Tools
│   ├── catalog/               # Local Embedding Service (sentence-transformers) cho Public Catalog
│   ├── services/              # Domain Services (Assessment Generator,...)
│   ├── schemas/               # Pydantic Schemas Request & Response cho mọi endpoint
│   ├── routers/               # FastAPI Endpoints: chat.py, ingest.py, memory.py, catalog.py, test_ai.py
│   └── main.py                # Khởi tạo FastAPI Application và cấu hình CORS/Middleware
├── tests/                     # Pytest Unit & Integration Test Suites
└── requirements.txt           # Python Dependencies
```

---

## 2. Quy chuẩn Phát triển AI Provider & Embedder

1. **Provider Abstraction:** Mọi tương tác với LLM đều phải kế thừa `BaseProvider` (`app/providers/base_provider.py`). Không được gọi trực tiếp Google GenAI SDK từ Router hoặc Service.
2. **Provider Mặc định:** Hiện tại dự án chuẩn hóa sử dụng **Google Gemini 3.5 Flash / Flash Lite** (`gemini-3.5-flash-lite` hoặc `gemini-3.5-flash`). Không tự ý thêm provider bên thứ ba (Groq, OpenAI, OpenRouter) nếu không có yêu cầu kiến trúc rõ ràng.
3. **Chiến lược Embedding:**
   - Sử dụng **`gemini-embedding-2`** (768 chiều) cho RAG tài liệu quản trị và bộ nhớ dài hạn.
   - Sử dụng mô hình cục bộ **`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`** cho gợi ý danh mục công khai (`public_catalog_*`) để tiết kiệm chi phí và không phụ thuộc mạng ngoài.

---

## 3. Quy chuẩn Router & Pydantic Schemas

1. **Giữ Router Tinh gọn:** Router chỉ làm nhiệm vụ:
   - Nhận Request và Validate qua Pydantic Schema.
   - Xác thực token nội bộ qua Dependency `verify_internal_token`.
   - Gọi Service/Engine tương ứng.
   - Trả Response chuẩn hóa. Không nhét logic trích xuất tệp, prompt phức tạp hoặc thao tác Qdrant trực tiếp trong Router.
2. **Pydantic Schemas Chặt chẽ:** Toàn bộ dữ liệu đầu vào/đầu ra phải được định nghĩa trong `app/schemas/`. Không sử dụng `dict` tự do cho các API contracts.
3. **Validation Structured Output:** Khi yêu cầu Gemini sinh dữ liệu có cấu trúc (Quiz, Rubric, JSON Question), phải sử dụng Pydantic để validate kết quả trước khi trả về cho Backend.

---

## 4. Bảo mật & Zero-Trust Architecture

1. **Internal Service Only:** `ai-service` là dịch vụ nội bộ, không expose ra ngoài Internet.
2. **Xác thực Token Bắt buộc:** Mọi endpoint (trừ `/test/health`) bắt buộc phải có Header `X-Internal-Token` khớp với `INTERNAL_SECRET`.
3. **Không kết nối MySQL:** `ai-service` không có kết nối cơ sở dữ liệu MySQL nghiệp vụ. Dữ liệu quản trị (nhân sự, hợp đồng, học viên) chỉ được truy cập gián tiếp qua **Tool Calling an toàn** do Backend xử lý và lọc bỏ các trường nhạy cảm (lương, mật khẩu, SĐT).
4. **Không log dữ liệu nhạy cảm:** Không ghi nhận API Key, Secret Token, hoặc thông tin cá nhân của người dùng vào tệp nhật ký (`app/core/logging.py`).

---

## 5. RAG Ingestion Pipeline & Qdrant Vector Store

1. **Idempotent Ingestion:** Khi nạp lại tài liệu có cùng `sourceId` (Snowflake ID từ MySQL), pipeline phải xóa toàn bộ chunk vector cũ trước khi upsert vector mới để ngăn ngừa trùng lặp dữ liệu.
2. **Multi-Modal Extractors:** Thêm định dạng mới phải kế thừa `BaseExtractor` và đăng ký trong `ExtractorFactory`. Với ảnh và PDF scan, kích hoạt fallback **OCR Gemini Vision**.
3. **Phân vùng Vector Collections:**
   - `management_knowledge`: Tri thức quản trị, học liệu (lọc theo `allowedRoles`).
   - `long_term_memory`: Ký ức hội thoại người dùng (lọc theo `ownerId` và `scope`).
   - `public_catalog_local_*`: Danh mục khóa học công khai.

---

## 6. Môi trường Thực thi & Kiểm thử (Testing)

1. **Virtual Environment:** Luôn chạy lệnh trong môi trường ảo `.venv` của `ai-service/`:
   ```bash
   cd ai-service
   source .venv/bin/activate  # Trên Windows: .venv\Scripts\activate
   ```
2. **Kiểm thử Tự động với Pytest:**
   ```bash
   pytest
   ```
3. **Quy tắc Unit Test:** Sử dụng Mock Dependencies cho Gemini SDK hoặc Qdrant khi chạy unit test thông thường để test chạy nhanh và không tiêu tốn quota API.