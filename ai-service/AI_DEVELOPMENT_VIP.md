# Thiết kế AI Service — AILMS

> Module: **AI Service** tách biệt hoàn toàn khỏi Spring Boot Backend
> Phạm vi: Prompt Engine, AI Provider (Gemini — tạm thời), RAG Engine (text/PDF/DOCX/Image/Video), Embedding, Vector Database
> **Cập nhật:** tạm thời chỉ dùng **Gemini** (bỏ Groq), RAG scope gồm cả **Image** và **Video** (tối đa **60 phút**/video), ingestion giữ **đồng bộ** như thiết kế gốc.
> **Chốt kiến trúc:** ngôn ngữ **Python (FastAPI)**, đặt trong **cùng monorepo** với backend/frontend hiện tại — không tách repo riêng.

---

## 1. Vị trí trong kiến trúc tổng

```
┌──────────────┐
│ React FE      │
└──────┬───────┘
       │ REST / SSE  (FE KHÔNG BAO GIỜ gọi thẳng AI Service)
┌──────▼───────┐
│ Spring Boot   │  business logic, RBAC, MySQL (dữ liệu thật)
│ Backend       │
└──────┬───────┘
       │ Internal REST + SSE  (X-Internal-Token, network nội bộ)
┌──────▼─────────────────────────────────────────────────────┐
│                       AI SERVICE (Python / FastAPI)           │
│                                                                │
│  ┌────────────┐   ┌─────────────┐   ┌─────────────────────┐ │
│  │ Prompt      │◀─▶│ RAG Engine   │   │ AI Provider           │ │
│  │ Engine      │   │              │   │  └─ Gemini 2.5 Flash   │ │
│  │ (templates, │   │ retrieve →   │──▶│     (generate + chat  │ │
│  │ truncate,   │   │ augment      │   │      streaming +      │ │
│  │ dedup cache)│   │ prompt       │   │      embedding)        │ │
│  └────────────┘   └──────┬───────┘   └─────────────────────┘ │
│                    ┌──────▼───────┐                             │
│                    │ Embedding     │                             │
│                    │ Service       │                             │
│                    │ (Gemini       │                             │
│                    │ text-embed-004)│                            │
│                    └──────┬───────┘                             │
│                    ┌──────▼───────┐                             │
│                    │ Vector DB     │                             │
│                    │ (Qdrant)      │                             │
│                    └──────────────┘                             │
└───────────────────────────────────────────────────────────────┘
                          │
                          ▼
                   External API: Gemini
```

**Nguyên tắc biên giới bắt buộc:**
- FE **không bao giờ** gọi thẳng AI Service — luôn đi qua Spring Boot.
- AI Service **không đụng MySQL nghiệp vụ** — chỉ nhận payload đã chuẩn hóa từ BE, xử lý, trả JSON, không lưu business data.
- AI Service chạy trong **docker network nội bộ**, không map port ra ngoài internet.
- Xác thực nội bộ bằng shared secret (`X-Internal-Token`), không dùng chung JWT của user.

---

## 2. Provider — tạm thời chỉ dùng Gemini

| Việc | Model | Ghi chú |
|---|---|---|
| Sinh mô tả khóa học / learning outcomes | Gemini 3.5 Flash | generate() thường |
| Tóm tắt tài liệu (PDF/DOCX/Image/Video) → markdown draft | Gemini 3.5 Flash | multimodal, xem mục 6 |
| Sinh câu hỏi Quiz từ nội dung Lesson | Gemini 3.5  Flash | structured output (Pydantic) |
| Gợi ý rubric chấm điểm Assignment | Gemini 2.5 Flash | structured output |
| AI Assistant chat (hỏi-đáp) | Gemini 3.5 Flash | **streaming** — Gemini hỗ trợ stream response, thay thế vai trò trước đây của Groq |
| Embedding cho RAG | Gemini `text-embedding-004` | dùng chung 1 provider, không cần thêm model riêng |

**Groq và OpenRouter:** tạm thời **không kích hoạt**. Kiến trúc vẫn giữ `base_provider.py` làm interface chung nên khi cần bật lại Groq (tốc độ chat) hoặc thêm OpenRouter (fallback) chỉ cần thêm implementation mới, không đổi luồng gọi ở Spring Boot hay router.

---

## 3. Vì sao tách Python service riêng, không viết module trong Spring Boot

| Lý do | Chi tiết |
|---|---|
| Ecosystem AI mạnh hơn | tiktoken/token counter, Pydantic (ép structured output), xử lý file đa định dạng (PDF/DOCX/ảnh) |
| Tách logic AI khỏi business logic | Prompt Builder, truncate, cache là logic AI thuần, không nên trộn vào Spring Boot |
| Scale độc lập | AI call là I/O-bound, chờ vài giây — tách container scale riêng, không ảnh hưởng BE đang phục vụ CRUD nhanh |
| Dễ đổi/thêm provider | Bật lại Groq, thêm OpenRouter/Claude sau này chỉ sửa trong AI Service |
| Cô lập rủi ro | AI Service timeout/crash không kéo sập BE chính |

**Tech stack:** Python 3.12 + FastAPI (async native, Pydantic validate request/response).

---

## 4. Cấu trúc thư mục AI Service

**Vị trí:** đặt trong **cùng monorepo** hiện tại của AILMS, ngang hàng với `backend/` và `frontend/` — không tách repo riêng, để đồng bộ versioning, CI/CD, và docker-compose gọi nhau dễ dàng qua tên service nội bộ.

```
ailms-project/                    # root monorepo (đã có sẵn)
 ├─ backend/ailms/                # Spring Boot (đã có)
 ├─ frontend/ailms-frontend/      # React (đã có)
 ├─ database/                     # scripts (đã có)
 ├─ ai-service/                   # ⭐ MỚI — Python/FastAPI
 │   └─ (chi tiết bên dưới)
 └─ docker-compose.yml            # thêm service ai-service, redis, qdrant vào đây
```

```
ai-service/
 ├─ app/
 │   ├─ main.py                            # FastAPI entrypoint
 │   ├─ core/
 │   │   ├─ config.py                      # ENV: GEMINI_API_KEY, INTERNAL_SECRET
 │   │   ├─ security.py                    # verify X-Internal-Token từ Spring Boot
 │   │   └─ cache.py                       # Redis client
 │   │
 │   ├─ providers/
 │   │   ├─ base_provider.py               # interface: generate(), chat_stream(), embed()
 │   │   └─ gemini_provider.py             # provider duy nhất đang active
 │   │                                     # (groq_provider.py, openrouter_provider.py: để sau, chưa thêm)
 │   │
 │   ├─ prompt_builder/
 │   │   ├─ templates/
 │   │   │   ├─ course_info.jinja2
 │   │   │   ├─ quiz_generation.jinja2
 │   │   │   ├─ rubric_generation.jinja2
 │   │   │   ├─ chat_assistant.jinja2
 │   │   │   └─ rag_augmented.jinja2       # system + retrieved_chunks + question
 │   │   └─ builder.py                     # render template + inject context + truncate
 │   │
 │   ├─ optimizer/
 │   │   ├─ token_counter.py               # đếm token, cắt input nếu vượt limit
 │   │   └─ dedup_cache.py                 # hash(prompt) → check Redis trước khi gọi API thật
 │   │
 │   ├─ rag/
 │   │   ├─ extractors/
 │   │   │   ├─ base_extractor.py          # interface: extract(file) → text + metadata
 │   │   │   ├─ pdf_extractor.py           # PyMuPDF/pdfplumber, giữ pageNumber
 │   │   │   ├─ docx_extractor.py          # python-docx/mammoth, giữ heading path
 │   │   │   ├─ image_extractor.py         # Gemini Vision: OCR chữ + mô tả diagram, 1 prompt xử lý cả 2 dạng
 │   │   │   └─ video_extractor.py         # Gemini multimodal: đọc trực tiếp video, xem mục 6
 │   │   ├─ chunker.py                     # cắt theo heading/đoạn, ~500 token/chunk, overlap 50
 │   │   ├─ embedder.py                    # gọi Gemini text-embedding-004, batch hóa
 │   │   ├─ retriever.py                   # query Qdrant, top-k + filter theo courseId/lessonId
 │   │   └─ ingestion_pipeline.py          # orchestrate: extract → chunk → embed → upsert (ĐỒNG BỘ)
 │   │
 │   ├─ vector_store/
 │   │   ├─ qdrant_client.py
 │   │   └─ schema.py                      # collection course_content
 │   │
 │   ├─ routers/
 │   │   ├─ generation.py                  # /generate/course-info, /generate/quiz, /generate/rubric
 │   │   ├─ chat.py                        # /chat/stream (SSE, Gemini streaming, có RAG augment)
 │   │   └─ ingest.py                      # /rag/ingest (đồng bộ — BE gọi khi publish/update lesson/file)
 │   │
 │   └─ schemas/
 │       ├─ quiz_schema.py
 │       ├─ rubric_schema.py
 │       └─ chat_schema.py
 │
 ├─ requirements.txt
 └─ Dockerfile
```

---

## 5. Prompt Engine — tối ưu token (từng bước)

**Bước 1 — Template hóa theo tính năng (Jinja2)**
M��i feature có 1 template cố định, chỉ inject biến động (title, outline, lesson content...).

**Bước 2 — Truncate/chunk input**
Nội dung dài (PDF/DOCX nhiều trang) → cắt còn phần liên quan hoặc chunk trước khi đưa vào prompt chính.

**Bước 3 — Ép structured output**
Dùng Pydantic schema ép Gemini trả JSON đúng field (`question`, `options`, `correctIndex`, `explanation`...) — tránh phải hỏi lại nhiều lần vì sai format.

**Bước 4 — Cache theo hash(prompt) trong Redis**
Trùng request y hệt (hoặc bấm lại do lỗi mạng) → trả cache, không gọi API tốn tiền lần 2. TTL đề xuất: 24h.

**Bước 5 — Model routing**
Hiện tại chỉ có Gemini nên bước này chưa áp dụng — để sẵn chỗ trong `providers/` cho khi bật lại Groq/OpenRouter.

---

## 6. RAG Engine — scope: Text, PDF, DOCX, Image, Video

### 6.1 Vì sao cần RAG

| Use case | Không RAG | Có RAG |
|---|---|---|
| Học viên hỏi về nội dung 1 bài học cụ thể | AI trả lời chung chung, có thể sai lệch | Retrieve đúng đoạn nội dung liên quan → trả lời bám sát tài liệu thật |
| Giảng viên sợ trùng câu hỏi quiz cũ | Không biết đã có câu hỏi tương tự | Semantic search trong ngân hàng câu hỏi cũ |
| AI Assistant hướng dẫn thao tác UI | Prompt nhét toàn bộ hướng dẫn mỗi lần | Retrieve đúng đoạn doc liên quan, prompt ngắn hơn |

### 6.2 Extractor theo từng loại file

| Loại file | Cách trích xuất | Metadata giữ lại | Độ trễ ước tính |
|---|---|---|---|
| Lesson text/markdown | Không cần extractor | — | <1s |
| PDF (text layer) | PyMuPDF/pdfplumber | pageNumber | 1–5s |
| PDF (scan/ảnh) | Gemini Vision (OCR) | pageNumber | 5–20s |
| DOCX | python-docx/mammoth | heading path | 1–5s |
| **Image** (jpg/png) | Gemini Vision — 1 prompt xử lý cả 2 dạng: nếu ảnh có chữ thì OCR nguyên văn, nếu là diagram/sơ đồ thì mô tả nội dung bằng lời | — | 2–10s |
| **Video** (mp4) | Gemini multimodal — gửi trực tiếp video cho Gemini (không cần ffmpeg/Whisper riêng), yêu cầu trả về transcript + mô tả nội dung theo mốc thời gian | timestamp segment | phụ thuộc độ dài video (xem lưu ý bên dưới) |

**Image extractor — chi tiết prompt:**
```
"Nếu ảnh chứa văn bản, trích xuất nguyên văn theo đúng bố cục.
 Nếu là sơ đồ/biểu đồ/hình minh họa, mô tả ngắn gọn nội dung và ý nghĩa.
 Trả về dạng text thuần để dùng cho tìm kiếm ngữ nghĩa."
```
Không cần tự viết logic phân loại "ảnh có chữ hay không" — để Gemini tự quyết định cách xử lý theo nội dung ảnh.

**Video extractor — chi tiết:**
```
Gemini 2.5 Flash hỗ trợ nhận input video trực tiếp (multimodal), nên KHÔNG cần
pipeline ffmpeg tách audio + Whisper transcribe riêng như phương án dùng Groq trước đây.

Luồng xử lý:
  1. Video file → gửi thẳng cho Gemini kèm prompt:
     "Trích xuất nội dung nói trong video này thành transcript có mốc thời gian
      (định dạng [mm:ss] nội dung), giữ đúng thuật ngữ chuyên môn."
  2. Gemini trả về transcript có timestamp
  3. Chunk theo đoạn timestamp (không chunk theo số từ như text thường)
  4. Lưu timestamp vào payload Qdrant → sau này AI Assistant có thể trả lời kèm
     "nội dung này ở phút 12:34 trong video", FE deep-link video tới giây đó
```

⚠️ **Lưu ý khi giữ ingestion đồng bộ với video:** vì `/rag/ingest` đang thiết kế đồng bộ (request đợi xử lý xong mới trả response — theo đúng yêu cầu giữ nguyên thiết kế gốc), video càng dài thì Spring Boot càng phải đợi lâu ở lần gọi ingest đó (có thể vài chục giây đến vài phút tùy độ dài). Vì AGENTS.md của dự án không có ràng buộc cụ thể, đề xuất tạm thời:
- Tăng timeout riêng cho request `/rag/ingest` (không dùng timeout mặc định ngắn của các API khác).
- Giới hạn độ dài video được ingest ở mức **≤ 60 phút** để tránh 1 request treo quá lâu — validate ở cả 2 phía: Spring Boot chặn trước khi gọi (check `video.duration`), AI Service cũng tự chặn phòng trường hợp gọi trực tiếp/sai lệch dữ liệu.
- Nếu sau này việc ingest video trở thành điểm nghẽn rõ rệt, đây sẽ là ứng viên đầu tiên để chuyển sang xử lý bất đồng bộ (job + callback), còn hiện tại giữ đồng bộ đúng như yêu cầu để đơn giản hóa kiến trúc.

### 6.3 Vector DB — Qdrant

Collection `course_content`, mỗi vector kèm payload:
```json
{
  "courseId": "...",
  "sectionId": "...",
  "lessonId": "...",
  "sourceType": "text | pdf | docx | image | video",
  "chunkText": "...",
  "chunkIndex": 0,
  "pageNumber": null,
  "timestamp": null
}
```
`pageNumber` dùng cho PDF, `timestamp` dùng cho video — payload filter theo `courseId`/`lessonId` đảm bảo không retrieve nhầm nội dung khóa khác.

### 6.4 Embedding

Dùng **Gemini `text-embedding-004`** cho toàn bộ nội dung (text, transcript từ ảnh, transcript từ video) — thống nhất 1 model embedding, không cần thêm dependency riêng.

---

## 7. Ingestion Pipeline — giữ ĐỒNG BỘ như thiết kế gốc

```
Bước 1  Spring Boot: lesson/file được publish hoặc cập nhật
        (text, PDF, DOCX, Image, hoặc Video)

Bước 2  Spring Boot gọi: POST /rag/ingest
        Body: { lessonId, courseId, sectionId, sourceType, file/content }

Bước 3  AI Service xử lý NGAY trong request (không trả job/status, không cần webhook):
          a. extractors/ tương ứng theo sourceType → text thô (+ page/timestamp nếu có)
          b. chunker.py — cắt đoạn theo heading/timestamp, ~500 token/chunk, overlap 50
          c. embedder.py — batch embed các chunk (Gemini text-embedding-004)
          d. Nếu là update: xóa vector cũ theo lessonId trước khi upsert vector mới
          e. Upsert vào Qdrant collection course_content

Bước 4  AI Service trả response ngay khi xử lý xong:
        { status: "ingested", chunksCount: N, sourceType: "..." }

Bước 5  Spring Boot cập nhật lesson.ragIndexStatus = INDEXED
```

Không dùng Message Queue, không dùng async job/callback — đúng nguyên tắc "đơn giản hóa, chỉ thêm phức tạp khi thật sự cần" đã thống nhất từ đầu.

---

## 8. Retrieval Pipeline — khi chat

```
Bước 1  Học viên/giảng viên hỏi trong AI Assistant (đang xem Lesson X)
Bước 2  Spring Boot forward: POST /chat/stream { question, courseId, lessonId }
Bước 3  AI Service:
          a. embedder.py — embed câu hỏi (Gemini text-embedding-004)
          b. retriever.py — Qdrant search, filter payload.courseId = X,
             ưu tiên payload.lessonId = lessonId hiện tại, top_k = 5
          c. prompt_builder — render rag_augmented.jinja2:
             system_prompt + retrieved_chunks (kèm nguồn: page/timestamp nếu có) + user_question
          d. gemini_provider.chat_stream() — gọi Gemini streaming với prompt đã augment
Bước 4  SSE: AI Service stream từng token → Spring Boot proxy nguyên trạng → FE
```

Response có thể kèm nguồn trích dẫn, ví dụ: *"...theo nội dung ở phút 12:34 trong video bài giảng"* hoặc *"...theo trang 5 tài liệu đính kèm"* — nhờ giữ `pageNumber`/`timestamp` trong payload từ bước ingest.

---

## 9. Giao tiếp Spring Boot ↔ AI Service

**Giao thức:** REST + SSE (không dùng gRPC ở giai đoạn này — chỉ 1 caller nội bộ là Spring Boot, traffic chưa lớn, gRPC là overkill).

**Xác thực:** header `X-Internal-Token` (shared secret qua ENV).

### 9.1 Generation request/response mẫu

```http
POST http://ai-service:8000/generate/quiz
Headers: X-Internal-Token: <secret>

Body:
{
  "requestId": "uuid",
  "userId": "snowflake-id",
  "feature": "quiz_generation",
  "context": {
    "lessonTitle": "...",
    "lessonContent": "...(markdown, đã truncate ở BE nếu quá dài)",
    "numQuestions": 5
  }
}

Response:
{
  "requestId": "uuid",
  "status": "success",
  "cached": false,
  "tokensUsed": 1240,
  "data": { "questions": [ { "question": "...", "options": [...], "correctIndex": 1, "explanation": "..." } ] }
}
```

### 9.2 Ingest request/response mẫu (đồng bộ, đa định dạng)

```http
POST http://ai-service:8000/rag/ingest
Headers: X-Internal-Token: <secret>

Body:
{
  "lessonId": "...",
  "courseId": "...",
  "sectionId": "...",
  "sourceType": "video",     // text | pdf | docx | image | video
  "fileUrl": "https://.../lesson-video.mp4"
}

Response:
{
  "status": "ingested",
  "chunksCount": 24,
  "sourceType": "video"
}
```

### 9.3 Chat streaming (SSE)

```
POST /chat/stream { question, courseId, lessonId }
→ AI Service trả text/event-stream, từng event là 1 chunk text từ Gemini
→ Spring Boot dùng WebClient + Flux<ServerSentEvent> proxy trực tiếp, KHÔNG parse rồi ghép lại
→ FE nhận SSE, render chữ chạy dần
```

### 9.4 Danh sách endpoint AI Service

```
POST /generate/course-info      → Gemini
POST /generate/quiz              → Gemini, structured output, có cache
POST /generate/rubric            → Gemini
POST /chat/stream                → Gemini streaming, có RAG augment
POST /rag/ingest                 → đồng bộ, hỗ trợ text/pdf/docx/image/video
GET  /internal/usage-stats       → Admin dashboard pull cost/usage theo tháng
```

---

## 10. Logging & Cost tracking

Bảng riêng bên AI Service (không chung MySQL business):
```
ai_usage_log:
  id, request_id, user_id, feature, provider (= "gemini"),
  tokens_in, tokens_out, cached (boolean),
  latency_ms, created_at

ingestion_log:
  id, lesson_id, source_type, chunks_count,
  latency_ms, status, created_at
```

---

## 11. Nguyên tắc an toàn & UX bắt buộc

1. Mọi nội dung AI sinh ra ở trạng thái **"gợi ý"** — chỉ ghi vào DB thật khi giảng viên bấm xác nhận.
2. Luôn gắn nhãn "✨ Nội dung do AI tạo — vui lòng kiểm tra lại" ở mọi vùng preview AI.
3. Không đưa dữ liệu cá nhân học viên vào prompt — chỉ đưa nội dung học thuật.
4. Log usage ngay từ Phase 0 để biết cost thực tế (đặc biệt quan trọng vì Gemini tính phí theo cả token lẫn xử lý video/ảnh, chi phí đa dạng hơn text thuần).
5. `userId` gửi sang AI Service chỉ dùng để log, phân quyền vẫn do Spring Boot xử lý trước khi forward.
6. Giới hạn kích thước/độ dài file được phép ingest: **video tối đa 60 phút** — nếu giảng viên upload video dài hơn, chặn ngay ở FE/BE trước khi gọi ingest, kèm thông báo rõ lý do (tránh timeout request đồng bộ).

---

## 12. Deploy (docker-compose)

```yaml
services:
  backend:
    build: ./backend/ailms
    environment:
      - AI_SERVICE_URL=http://ai-service:8000
      - AI_SERVICE_INTERNAL_TOKEN=${AI_INTERNAL_SECRET}
    depends_on: [ai-service]

  ai-service:
    build: ./ai-service
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - INTERNAL_SECRET=${AI_INTERNAL_SECRET}
      - REDIS_URL=redis://redis:6379
      - QDRANT_URL=http://qdrant:6333
    depends_on: [redis, qdrant]
    # KHÔNG map port ra host, chỉ nội bộ docker network

  redis:
    image: redis:7-alpine

  qdrant:
    image: qdrant/qdrant
    volumes: [qdrant_data:/qdrant/storage]
    # không map port ra ngoài

volumes:
  qdrant_data:
```

---

## 13. Roadmap triển khai (từng bước, chưa code)

```
Phase 0  Khung ai-service: FastAPI skeleton + gemini_provider.py + internal auth (X-Internal-Token)

Phase 1  generate-course-info + generate-quiz (Gemini, KHÔNG cần RAG)
         → test luồng end-to-end Spring Boot ↔ AI Service

Phase 2  Chat cơ bản (Gemini streaming, SSE) — CHƯA có RAG
         → validate luồng streaming trước khi thêm phức tạp

Phase 3  RAG — Ingestion pipeline (đồng bộ)
         → extractors: text, pdf, docx trước (đơn giản, nhanh)

Phase 4  RAG — Ingestion mở rộng: image, video
         → image_extractor.py, video_extractor.py (Gemini Vision/multimodal)

Phase 5  RAG — Retrieval
         → nối retriever vào /chat/stream, AI Assistant trả lời bám nội dung thật,
           kèm trích dẫn nguồn (trang/timestamp)

Phase 6  generate-rubric (Assignment)

Phase 7  Token optimizer đầy đủ
         → dedup cache, chunk size tuning theo dữ liệu thật

Phase 8  (khi cần) bật lại Groq cho chat (tốc độ), thêm OpenRouter (fallback)
         → chỉ thêm provider mới, không đổi kiến trúc router/schema hiện có
```

---

## 14. Quyết định đã chốt

- [x] Ngôn ngữ AI Service: **Python (FastAPI)**
- [x] Vị trí repo: `ai-service/` trong **cùng monorepo** hiện tại
- [x] Giới hạn video ingest: **tối đa 60 phút**

## 15. Việc còn mở

- [ ] Khi nào cân nhắc bật lại Groq — theo mốc traffic cụ thể hay theo feedback UX chat chậm?
- [ ] AGENTS.md hiện có quy tắc cho `backend/` và `frontend/` — cần bổ sung 1 mục riêng cho `ai-service/` (quy ước Python: format code, cách chạy test, cách quản lý ENV) để giữ đồng bộ quy chuẩn toàn repo?