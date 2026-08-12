# RAG và Long-term Memory hoạt động như thế nào?

Tài liệu này giải thích phần RAG, Qdrant và long-term memory đang có trong `ai-service`. Mục tiêu là giúp người chưa quen AI vẫn hiểu dữ liệu đi từ backend tới đâu, được biến đổi như thế nào và cuối cùng được tìm lại ra sao.

## 1. Hiểu nhanh trong một phút

Hệ thống có hai loại model khác nhau:

1. **Model sinh nội dung** `gemini-3.5-flash-lite`: nhận prompt và viết câu trả lời bằng ngôn ngữ tự nhiên.
2. **Model embedding** `gemini-embedding-2`: biến text/ảnh/PDF thành một dãy số gọi là vector. Model này không viết câu trả lời.

Qdrant là database chuyên lưu các vector. Khi cần tìm nội dung, hệ thống biến câu hỏi thành vector rồi tìm những vector tài liệu gần nó nhất.

Ví dụ:

- Tài liệu có câu: `Nhân viên được nghỉ phép 12 ngày mỗi năm`.
- Người dùng hỏi: `Một năm được nghỉ bao nhiêu ngày?`.
- Hai câu không giống từng chữ, nhưng có ý nghĩa gần nhau.
- Embedding của hai câu sẽ nằm gần nhau trong không gian vector.
- Qdrant vì vậy có thể tìm đúng đoạn tài liệu.

Đó gọi là **semantic search**, tức tìm theo ý nghĩa thay vì chỉ tìm từ khóa giống hệt.

## 2. RAG là gì?

RAG là viết tắt của Retrieval-Augmented Generation. Có thể hiểu đơn giản là:

```text
Tìm tài liệu liên quan trước
        ↓
Đưa tài liệu đó cho Gemini làm ngữ cảnh
        ↓
Gemini trả lời dựa trên dữ liệu thật
```

Nếu không có RAG, Gemini chỉ trả lời dựa trên kiến thức sẵn có của model và có thể trả lời chung chung hoặc bịa thông tin.

Nếu có RAG, hệ thống tìm đúng nội dung bài học/chính sách trước, rồi yêu cầu Gemini trả lời dựa trên nội dung vừa tìm được.

RAG có hai giai đoạn riêng:

- **Ingestion:** đọc và lưu tài liệu vào Qdrant. Thường chạy khi bài học hoặc file được publish/cập nhật.
- **Retrieval:** tìm lại những đoạn liên quan. Chạy mỗi khi người dùng đặt câu hỏi.

## 3. Kiến trúc hiện tại

```text
Frontend
   │
   │ Chỉ gọi API nghiệp vụ
   ▼
Spring Boot Backend
   │
   │ X-Internal-Token
   ▼
FastAPI AI Service
   ├── Gemini generate/chat
   ├── Extractor
   ├── Chunker
   ├── Gemini Embedder
   ├── Retriever
   ├── Ingestion Pipeline
   └── Long-term Memory
             │
             ▼
           Qdrant
```

Các nguyên tắc quan trọng:

- Frontend không gọi trực tiếp `ai-service`.
- Backend kiểm tra đăng nhập, phân quyền và quyết định dữ liệu nào được gửi sang AI.
- `ai-service` không đọc trực tiếp MySQL nghiệp vụ.
- Các API RAG/memory đều cần header `X-Internal-Token`.
- ID truyền giữa backend và AI service dùng dạng string.

## 4. Hai collection Qdrant

Hiện có hai collection độc lập:

| Collection | Dùng để làm gì? |
|---|---|
| `management_knowledge` | Lưu vector của tri thức quản trị dạng text, PDF, DOCX và ảnh |
| `long_term_memory` | Lưu thông tin cần nhớ lâu theo từng người/chủ thể |

Tách collection giúp memory của người dùng không bị trộn với nội dung tài liệu.

Mỗi vector hiện có 768 chiều, được cấu hình bằng `EMBEDDING_DIMENSION=768`. Nếu sau này đổi model embedding hoặc đổi số chiều, phải tạo/migrate collection tương ứng; không thể ghi vector 1.024 chiều vào collection 768 chiều.

## 5. Luồng ingestion chi tiết

Endpoint:

```http
POST /rag/ingest
X-Internal-Token: <internal-secret>
```

Luồng xử lý:

```text
Request từ backend
      ↓
Validate schema
      ↓
Chọn extractor theo sourceType
      ↓
Trích xuất text và metadata
      ↓
Chunk văn bản thành các đoạn nhỏ
      ↓
Gemini biến từng chunk thành vector
      ↓
Đảm bảo collection management_knowledge tồn tại
      ↓
Xóa vector cũ có cùng sourceId
      ↓
Upsert vector mới vào Qdrant
      ↓
Trả số chunk đã lưu
```

### 5.1 Tại sao cần `sourceId`?

`sourceId` là ID ổn định của nguồn dữ liệu. Ví dụ:

- Nội dung lesson: `lesson-content-123`.
- File PDF: `file-987`.
- Policy: `policy-attendance-v3`.

Khi ingest lại cùng `sourceId`, pipeline xóa toàn bộ vector cũ trước rồi mới ghi dữ liệu mới. Nhờ vậy việc cập nhật tài liệu không tạo ra chunk trùng hoặc để lại nội dung cũ.

ID của từng vector được tạo ổn định từ:

```text
sourceId + chunkIndex
```

### 5.2 Ingest text

Request mẫu:

```json
{
  "sourceId": "lesson-content-123",
  "sourceType": "text",
  "content": "Spring Boot sử dụng Dependency Injection để quản lý dependency...",
  "courseId": "course-10",
  "sectionId": "section-20",
  "lessonId": "lesson-123",
  "metadata": {
    "title": "Dependency Injection"
  }
}
```

Với `sourceType = text`, trường `content` là bắt buộc.

### 5.3 Ingest PDF hoặc DOCX

AI service hiện nhận file dưới dạng chuỗi Base64:

```json
{
  "sourceId": "file-987",
  "sourceType": "pdf",
  "fileBase64": "JVBERi0xLjQKJ...",
  "courseId": "course-10",
  "lessonId": "lesson-123",
  "metadata": {
    "fileName": "spring-boot-guide.pdf"
  }
}
```

Với `sourceType = pdf` hoặc `docx`, `fileBase64` là bắt buộc.

Lưu ý: Base64 làm payload lớn hơn file gốc. Đây là hợp đồng đơn giản cho phase hiện tại. Khi file lớn hơn, có thể thêm một lớp `SourceResolver` để AI service tải file từ MinIO bằng URL nội bộ có kiểm soát mà không phải sửa extractor/chunker/pipeline.

### 5.4 Response ingestion

```json
{
  "status": "ingested",
  "chunksCount": 8,
  "sourceType": "pdf"
}
```

Đây là ingestion đồng bộ: backend đợi toàn bộ quá trình hoàn tất rồi mới nhận response.

## 6. Extractor hoạt động thế nào?

Mọi extractor đều implement `BaseExtractor` và trả về cùng một cấu trúc `ExtractedDocument`. Vì đầu ra giống nhau nên pipeline không cần biết bên trong PDF và DOCX được đọc khác nhau như thế nào.

```text
TextExtractor ─┐
PdfExtractor  ─┼──> ExtractedDocument ──> Chunker
DocxExtractor ─┘
```

### Text extractor

- Nhận plain text hoặc Markdown.
- Loại bỏ khoảng trắng thừa ở đầu/cuối.
- Giữ nguyên nội dung để chunker xử lý.

### PDF extractor

- Dùng PyMuPDF đọc text layer của từng trang.
- Mỗi segment giữ `pageNumber`.
- Khi tìm thấy chunk sau này, hệ thống biết nó đến từ trang nào.
- Trang PDF scan không có text layer được render thành ảnh và OCR bằng Gemini Vision.

Ví dụ metadata của một segment PDF:

```json
{
  "pageNumber": 5
}
```

### DOCX extractor

- Dùng `python-docx` đọc từng paragraph.
- Theo dõi heading gần nhất.
- Paragraph thường được gắn `headingPath`.

Ví dụ:

```json
{
  "headingPath": "Chương 2 > Dependency Injection"
}
```

### Extractor factory

`ExtractorFactory` ánh xạ `sourceType` sang extractor:

```text
text → TextExtractor
pdf  → PdfExtractor
docx → DocxExtractor
```

Khi thêm ảnh hoặc video, chỉ cần viết `ImageExtractor`/`VideoExtractor` theo `BaseExtractor` rồi đăng ký vào factory. Ingestion pipeline không cần đổi.

## 7. Chunker hoạt động thế nào?

Gemini embedding và Qdrant hoạt động tốt hơn khi tài liệu được chia thành các đoạn vừa phải. Không nên lưu cả tài liệu 100 trang thành một vector vì:

- Vector sẽ đại diện cho quá nhiều chủ đề.
- Kết quả tìm kiếm không chỉ ra đúng đoạn liên quan.
- Khi đưa context cho Gemini sẽ tốn nhiều token.

Cấu hình hiện tại:

```dotenv
CHUNK_SIZE=2000
CHUNK_OVERLAP=200
```

Đơn vị hiện tại là **ký tự**, chưa phải token.

Chunker ưu tiên cắt theo thứ tự:

1. Giữa hai paragraph.
2. Cuối câu.
3. Khoảng trắng.
4. Cắt cứng nếu không tìm thấy ranh giới phù hợp.

Overlap nghĩa là cuối chunk trước được lặp lại ở đầu chunk sau. Điều này tránh mất ngữ cảnh khi một ý nằm đúng tại ranh giới.

```text
Chunk 1: ... Spring quản lý các object này trong IoC Container.
                                      └──── overlap ────┐
Chunk 2:             object này trong IoC Container. Dependency Injection...
```

Mỗi chunk giữ lại metadata của segment gốc, ví dụ `pageNumber` hoặc `headingPath`.

## 8. Embedding hoạt động thế nào?

`GeminiEmbedder` có hai chế độ:

- `embed_documents`: biến các chunk tài liệu thành vector với task type `RETRIEVAL_DOCUMENT`.
- `embed_query`: biến câu hỏi thành vector với task type `RETRIEVAL_QUERY`.

Tài liệu được gửi theo batch, mặc định tối đa 32 đoạn mỗi lần gọi Gemini. Batch giúp giảm số request và thời gian mạng.

Ví dụ khái niệm:

```text
"Dependency Injection là gì?"
             ↓ embedding
[0.018, -0.227, 0.091, ..., 0.112]  # tổng cộng 768 số
```

Các con số riêng lẻ không mang ý nghĩa để con người đọc. Điều quan trọng là khoảng cách giữa hai vector phản ánh mức độ gần nhau về ngữ nghĩa.

## 9. Dữ liệu lưu trong Qdrant

Một point trong `management_knowledge` có dạng khái niệm như sau:

```json
{
  "id": "uuid ổn định",
  "vector": [0.018, -0.227, 0.091],
  "payload": {
    "sourceId": "file-987",
    "sourceType": "pdf",
    "courseId": "course-10",
    "lessonId": "lesson-123",
    "pageNumber": 5,
    "chunkIndex": 3,
    "chunkText": "Dependency Injection là một kỹ thuật...",
    "fileName": "spring-boot-guide.pdf"
  }
}
```

`vector` dùng để tìm kiếm. `payload` dùng để:

- Trả lại nội dung thật.
- Hiển thị nguồn/trang.
- Filter theo course, lesson hoặc loại tài liệu.

## 10. Luồng semantic search

Endpoint:

```http
POST /rag/search
X-Internal-Token: <internal-secret>
```

Request:

```json
{
  "query": "Spring quản lý dependency như thế nào?",
  "limit": 5,
  "filters": {
    "courseId": "course-10",
    "lessonId": "lesson-123"
  }
}
```

Luồng chạy:

```text
Câu hỏi
   ↓ Gemini embed_query
Vector câu hỏi
   ↓ Qdrant cosine similarity + payload filters
Top 5 chunk gần nhất
   ↓
Response gồm text, score và metadata
```

Response ví dụ:

```json
[
  {
    "score": 0.87,
    "text": "Dependency Injection cho phép Spring cung cấp dependency...",
    "metadata": {
      "sourceId": "file-987",
      "sourceType": "pdf",
      "courseId": "course-10",
      "lessonId": "lesson-123",
      "pageNumber": 5,
      "chunkIndex": 3
    }
  }
]
```

`score` càng cao thường càng liên quan, nhưng chưa có một ngưỡng đúng cho mọi dữ liệu. Cần đo trên tài liệu thật trước khi đặt score threshold.

Filter rất quan trọng. Nếu học viên đang ở `course-10`, backend phải gửi filter course phù hợp để không lấy nhầm nội dung của khóa khác.

## 11. Long-term memory là gì?

RAG và memory đều dùng vector nhưng mục đích khác nhau:

| RAG | Long-term memory |
|---|---|
| Nhớ nội dung tài liệu | Nhớ thông tin liên quan đến một owner |
| Ví dụ: nội dung bài học | Ví dụ: mục tiêu học tập hoặc sở thích |
| Collection `management_knowledge` | Collection `long_term_memory` |
| Filter course/lesson | Luôn filter `ownerId` |

Ví dụ memory phù hợp:

- `Học viên muốn học Java backend`.
- `Học viên thích ví dụ ngắn và có code`.
- `Học viên đang yếu phần Dependency Injection`.

Không nên tự động lưu mọi câu chat. Backend hoặc memory extraction layer sau này phải quyết định thông tin nào đáng nhớ, được người dùng cho phép và không nhạy cảm.

## 12. Ghi, tìm và xóa memory

### 12.1 Ghi memory

```http
PUT /memory/user-123/learning-goal
X-Internal-Token: <internal-secret>
Content-Type: application/json
```

```json
{
  "content": "Người học muốn tập trung vào Java Spring Boot",
  "metadata": {
    "type": "learning_preference",
    "createdBy": "explicit_user_action"
  }
}
```

Trong URL:

- `user-123` là `ownerId`.
- `learning-goal` là `memoryId` ổn định.

Gọi lại cùng cặp `ownerId + memoryId` sẽ cập nhật point đó thay vì tạo bản trùng.

Response thành công là HTTP `204 No Content`.

### 12.2 Recall memory

```http
POST /memory/recall
X-Internal-Token: <internal-secret>
```

```json
{
  "ownerId": "user-123",
  "query": "Người này muốn học công nghệ gì?",
  "limit": 5
}
```

Response:

```json
[
  {
    "memoryId": "learning-goal",
    "content": "Người học muốn tập trung vào Java Spring Boot",
    "score": 0.9,
    "metadata": {
      "type": "learning_preference",
      "createdBy": "explicit_user_action"
    }
  }
]
```

Code luôn thêm filter `ownerId`. Memory của `user-123` không được trả về khi recall cho `user-456`.

### 12.3 Xóa một memory

```http
DELETE /memory/user-123?memory_id=learning-goal
X-Internal-Token: <internal-secret>
```

### 12.4 Xóa toàn bộ memory của một owner

```http
DELETE /memory/user-123
X-Internal-Token: <internal-secret>
```

Hai API xóa đều trả HTTP `204 No Content`.

## 13. RAG khác lịch sử chat thế nào?

Ba khái niệm này không giống nhau:

| Loại dữ liệu | Ví dụ | Nơi lưu đề xuất |
|---|---|---|
| Lịch sử chat ngắn hạn | 5 lượt hỏi đáp gần nhất | Redis, TTL khoảng 30 phút |
| Long-term memory | Mục tiêu/sở thích cần nhớ lâu | Qdrant `long_term_memory` |
| Tài liệu RAG | Hướng dẫn quản trị, PDF, policy | Qdrant `management_knowledge` |

Lịch sử chat giúp hiểu câu nối tiếp như `còn trường hợp kia thì sao?`. Long-term memory giúp cá nhân hóa giữa nhiều phiên. RAG giúp trả lời dựa trên tài liệu thật.

Một luồng chat hoàn chỉnh về sau sẽ là:

```text
Câu hỏi mới
   ↓
Đọc lịch sử ngắn hạn từ Redis
   ↓
Viết lại câu hỏi thành câu độc lập
   ↓
Recall long-term memory theo ownerId
   ↓
Retrieve tài liệu theo module và allowedRoles
   ↓
Ghép system prompt + memory + tài liệu + câu hỏi
   ↓
gemini-3.5-flash-lite sinh câu trả lời
   ↓
Stream SSE về backend → frontend
```

## 14. Phần nào đã chạy, phần nào chưa nối?

### Đã có trong code

- Model sinh text/chat Gemini.
- Text, PDF text layer và DOCX extractor.
- Chunker có overlap.
- Gemini embedding theo batch.
- Qdrant vector store.
- Ingestion đồng bộ và cập nhật lại theo `sourceId`.
- Semantic search có filter.
- Long-term memory remember/recall/forget theo owner.
- Lịch sử hội thoại bền vững phía backend có scope, phân trang, rename, feedback và ownership 404.
- Qdrant service và persistent volume trong Docker Compose.
- Internal token cho toàn bộ endpoint RAG/memory.

### Chưa có hoặc chưa nối

- `/chat/stream` đã gọi query rewriter, retriever và long-term memory trước khi stream.
- Đã có context builder để ghép lịch sử, memory và tài liệu quản trị.
- Lịch sử bền vững lưu ở MySQL; Redis giữ tối đa 10 message gần nhất với TTL 30 phút cho prompt.
- Đã có OCR ảnh và OCR fallback cho PDF scan; chưa có video extractor.
- Chưa có URL/MinIO source resolver; file đang gửi bằng Base64.
- Backend chưa có DTO/client cho endpoint RAG và memory mới.
- Chưa có score threshold/reranker dựa trên dữ liệu thật.
- Chưa có logging token, latency và ingestion status.

Vì vậy hiện tại `/rag/search` trả về các đoạn liên quan, nhưng chưa tự gọi Gemini để biến chúng thành câu trả lời hoàn chỉnh.

## 15. Tại sao thiết kế nhiều interface?

Các interface chính:

- `BaseExtractor`
- `BaseEmbedder`
- `BaseVectorStore`

Mục đích không phải làm code phức tạp, mà để các phần ít phụ thuộc nhau:

- Thêm `ImageExtractor` không sửa ingestion pipeline.
- Đổi Gemini embedding sang model khác không sửa retriever.
- Đổi Qdrant sang vector database khác không sửa chunker/extractor.
- Unit test dùng embedder/vector store trong bộ nhớ, không tốn API Gemini và không cần Qdrant thật.

Dependency flow hiện tại:

```text
Router
  └── IngestionPipeline / Retriever / LongTermMemoryStore
        ├── BaseExtractor implementation
        ├── BaseEmbedder implementation
        └── BaseVectorStore implementation
```

Lớp nghiệp vụ chỉ biết interface, implementation mặc định hiện là Gemini và Qdrant.

## 16. Cấu hình môi trường

```dotenv
GEMINI_API_KEY=your-real-key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
INTERNAL_SECRET=replace-this-secret
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=
```

Các cấu hình có default trong code:

| Biến | Default | Ý nghĩa |
|---|---:|---|
| `QDRANT_CONTENT_COLLECTION` | `management_knowledge` | Collection tri thức quản trị |
| `QDRANT_MEMORY_COLLECTION` | `long_term_memory` | Collection memory |
| `EMBEDDING_DIMENSION` | `768` | Số chiều vector |
| `EMBEDDING_BATCH_SIZE` | `32` | Số đoạn mỗi batch embedding |
| `CHUNK_SIZE` | `2000` | Kích thước chunk theo ký tự |
| `CHUNK_OVERLAP` | `200` | Số ký tự overlap |

Không commit API key hoặc internal secret thật vào source code.

## 17. Cấu trúc file cần đọc

```text
app/
├── core/config.py                       # ENV và default
├── providers/
│   ├── base_provider.py                 # Hợp đồng generate/chat
│   └── gemini_provider.py               # Gọi Gemini
├── rag/
│   ├── models.py                        # Model trung gian
│   ├── extractors/
│   │   ├── base_extractor.py            # Hợp đồng extractor
│   │   ├── text_extractor.py
│   │   ├── pdf_extractor.py
│   │   ├── docx_extractor.py
│   │   └── factory.py                   # Chọn extractor
│   ├── chunker.py                       # Chia đoạn
│   ├── embedder.py                      # Tạo vector
│   ├── ingestion_pipeline.py            # Điều phối ingest
│   └── retriever.py                     # Semantic search
├── vector_store/
│   ├── base.py                          # Hợp đồng vector DB
│   └── qdrant_store.py                  # Qdrant implementation
├── memory/
│   └── long_term_memory.py              # Remember/recall/forget
├── schemas/
│   ├── rag_schema.py                    # Request/response RAG
│   └── memory_schema.py                 # Request/response memory
└── routers/
    ├── ingest.py                        # /rag/ingest, /rag/search
    └── memory.py                        # /memory/*
```

Nếu muốn đọc code theo đúng luồng, nên đọc theo thứ tự:

1. `schemas/rag_schema.py`
2. `routers/ingest.py`
3. `rag/ingestion_pipeline.py`
4. `rag/extractors/*`
5. `rag/chunker.py`
6. `rag/embedder.py`
7. `vector_store/qdrant_store.py`
8. `rag/retriever.py`
9. `memory/long_term_memory.py`

## 18. Thứ tự triển khai tiếp theo đề xuất

1. Thêm DTO và client backend cho ingest/search/memory.
2. Ingest text lesson thật và kiểm tra kết quả Qdrant.
3. Nối retriever vào `/chat/stream`.
4. Thêm prompt builder và trả citation từ metadata.
5. Đo chất lượng Redis short-term history và query rewriting bằng hội thoại thật.
6. Nối long-term memory vào chat với quy tắc lưu rõ ràng.
7. Thêm MinIO source resolver cho file lớn.
8. Đánh giá OCR ảnh/PDF thật, sau đó mới thêm video extractor.
9. Đo retrieval bằng dữ liệu thật để chỉnh chunk size, top-k và threshold.

Không nên làm image/video trước khi text/PDF/DOCX → retrieve → chat chạy ổn định end-to-end, vì chúng làm ingestion phức tạp và tốn chi phí hơn nhiều.


Tools

Agent / Orchestrator

Workflow / Planning

Approval / Guardrails, chi tiết 
