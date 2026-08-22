# Luồng RAG chi tiết của AILMS

## 1. Phạm vi tài liệu

Tài liệu này mô tả đúng luồng RAG đang được triển khai trong hệ thống AILMS, gồm:

- Nạp `ClassResource` và `LessonResource` vào Qdrant.
- Trích xuất PDF, DOCX, TXT, Markdown và ảnh.
- Chunking, local embedding 384 chiều và idempotent upsert.
- Scoped retrieval cho AI Chat học viên.
- Truy xuất tài liệu lớp để sinh Quiz/Assignment.
- Xóa, retry, phân quyền, citation và các nhánh lỗi.

Hệ thống hiện dùng `FastEmbed` với model `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. `GeminiEmbedder` 768 chiều vẫn tồn tại trong mã nguồn nhưng không phải embedder mặc định của ingestion, retrieval và long-term memory.

## 2. Kiến trúc RAG tổng thể

```mermaid
flowchart LR
    subgraph Clients["Client"]
        Teacher["Teacher Portal"]
        Student["Student Course Player"]
    end

    subgraph Backend["Spring Boot Backend"]
        Security["JWT, RBAC và kiểm tra quyền"]
        ResourceService["ClassResourceService và LessonResourceService"]
        ContextService["StudentLearningAiContextService"]
        AssessmentService["AiAssessmentAuthoringService"]
        ChatService["AiChatService"]
        Events["After-commit async ingestion event"]
    end

    subgraph Storage["Nghiệp vụ và tệp"]
        MySQL[("MySQL")]
        MinIO[("MinIO")]
        Redis[("Redis")]
    end

    subgraph AI["FastAPI AI Service"]
        InternalAuth["X-Internal-Token"]
        Extractors["PDF, DOCX, Text và Image Extractors"]
        Chunker["RecursiveTextChunker"]
        Embedder["FastEmbed local 384d"]
        Retriever["Scoped Retriever"]
        Prompt["Context Builder"]
        Gemini["Gemini LLM và Vision OCR"]
    end

    Qdrant[("Qdrant management_knowledge_local")]

    Teacher --> Security
    Student --> Security
    Security --> ResourceService
    Security --> ContextService
    Security --> AssessmentService
    Security --> ChatService
    ResourceService --> MySQL
    ResourceService --> MinIO
    ResourceService --> Events
    Events --> InternalAuth
    ChatService --> ContextService
    ChatService --> MySQL
    ChatService --> Redis
    ChatService --> InternalAuth
    AssessmentService --> MySQL
    AssessmentService --> Redis
    AssessmentService --> InternalAuth
    InternalAuth --> Extractors
    Extractors --> Chunker
    Chunker --> Embedder
    Embedder --> Qdrant
    InternalAuth --> Retriever
    Retriever --> Embedder
    Retriever --> Qdrant
    Retriever --> Prompt
    Prompt --> Gemini
    Gemini --> ChatService
    Gemini --> AssessmentService
```

Nguyên tắc ranh giới:

- Frontend không gọi trực tiếp AI Service hoặc Qdrant.
- Backend là nơi xác thực JWT, quyền truy cập course/class/lesson và trạng thái enrollment.
- AI Service chỉ nhận request nội bộ có `X-Internal-Token`.
- AI Service không truy cập trực tiếp MySQL nghiệp vụ.
- MySQL lưu metadata và trạng thái; MinIO lưu file gốc; Qdrant chỉ lưu vector, chunk text và metadata phục vụ lọc.

## 3. Luồng ingestion tài liệu

### 3.1. Luồng từ upload đến Qdrant

```mermaid
sequenceDiagram
    actor T as Teacher hoặc Admin
    participant FE as Frontend
    participant BE as Spring Boot Backend
    participant DB as MySQL
    participant FS as MinIO
    participant EV as Async Event Listener
    participant AI as FastAPI AI Service
    participant EX as Extractor
    participant CH as Chunker
    participant EM as FastEmbed 384d
    participant Q as Qdrant

    T->>FE: Upload tài liệu lớp hoặc lesson
    FE->>BE: Gửi metadata và fileKey
    BE->>BE: Xác thực quyền quản lý
    BE->>DB: Lưu resource
    BE->>FS: File gốc đã được lưu
    BE->>EV: Phát event sau khi transaction commit

    alt ClassResource
        BE->>DB: ragStatus = PENDING
        EV->>DB: ragStatus = PROCESSING
    end

    EV->>FS: Đọc file bằng fileKey
    EV->>AI: POST /rag/ingest và X-Internal-Token
    AI->>AI: Validate IngestRequest
    AI->>EX: Extract theo sourceType
    EX-->>AI: ExtractedDocument và metadata trang/heading
    AI->>CH: Chia chunk 2000 ký tự, overlap 200
    CH-->>AI: Danh sách TextChunk
    AI->>EM: Embed documents theo batch 32
    EM-->>AI: Vector 384 chiều
    AI->>Q: Ensure cosine collection 384d
    AI->>Q: Delete points có cùng sourceId
    AI->>Q: Upsert UUIDv5, vector, chunkText và metadata
    Q-->>AI: Hoàn tất đồng bộ
    AI-->>EV: chunksCount

    alt ClassResource thành công
        EV->>DB: ragStatus = READY và lưu chunksCount
    else ClassResource thất bại
        EV->>DB: ragStatus = FAILED và lưu thông báo an toàn
    else LessonResource
        EV->>EV: Chỉ ghi log nếu lỗi, chưa lưu ragStatus riêng
    end
```

Backend xử lý event bất đồng bộ sau commit, nhưng endpoint `/rag/ingest` của AI Service vẫn xử lý đồng bộ trong chính request nội bộ đó.

### 3.2. Chọn extractor

```mermaid
flowchart TD
    Input["Nguồn đầu vào"] --> Type{"sourceType"}

    Type -->|text| Text["TextExtractor"]
    Type -->|docx| Docx["DocxExtractor"]
    Type -->|pdf| Pdf["PdfExtractor"]
    Type -->|image| Image["ImageExtractor"]

    Text --> TextResult["UTF-8 text hoặc Markdown"]
    Docx --> DocxResult["Đoạn văn và headingPath"]
    Pdf --> PdfText{"Trang có text layer?"}
    PdfText -->|Có| Native["PyMuPDF lấy text và pageNumber"]
    PdfText -->|Không| PdfOcr["Render trang thành PNG và Gemini Vision OCR"]
    Image --> ImageOcr["Gemini Vision OCR và mô tả bảng, biểu đồ, sơ đồ"]

    TextResult --> Document["ExtractedDocument"]
    DocxResult --> Document
    Native --> Document
    PdfOcr --> Document
    ImageOcr --> Document
```

Local RAG không embedding trực tiếp byte ảnh/PDF. Hệ thống dùng Gemini Vision để chuyển phần ảnh hoặc trang scan thành text, sau đó text mới được chunk và embedding local.

### 3.3. Chunking và embedding

```mermaid
flowchart LR
    Document["ExtractedDocument"] --> Segment["Duyệt từng segment"]
    Segment --> Normalize["Chuẩn hóa khoảng trắng"]
    Normalize --> Split["Ưu tiên ngắt đoạn, câu rồi khoảng trắng"]
    Split --> Window["Chunk tối đa 2000 ký tự"]
    Window --> Overlap["Overlap 200 ký tự"]
    Overlap --> Metadata["Giữ pageNumber hoặc headingPath"]
    Metadata --> Passage["Thêm prefix passage:"]
    Passage --> FastEmbed["FastEmbed ONNX, batch 32"]
    FastEmbed --> MiniLM["paraphrase-multilingual-MiniLM-L12-v2"]
    MiniLM --> Vector["Vector float 384 chiều"]
```

Cấu hình hiện tại:

| Thuộc tính | Giá trị |
|---|---|
| Model local | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| Runtime | `fastembed.TextEmbedding` |
| Dimension | `384` |
| Batch size | `32` |
| Chunk size | `2000` ký tự |
| Chunk overlap | `200` ký tự |
| Distance | Cosine |
| RAG collection | `management_knowledge_local` |

### 3.4. Idempotent upsert

```mermaid
flowchart TD
    Start["Bắt đầu ingest sourceId"] --> Extract["Extract, chunk và tạo vectors mới"]
    Extract --> Valid{"Số vector bằng số chunk?"}
    Valid -->|Không| Fail["Dừng và trả lỗi"]
    Valid -->|Có| Ensure["Ensure collection 384d"]
    Ensure --> Delete["Xóa toàn bộ point cũ theo sourceId"]
    Delete --> Build["Tạo point ID UUIDv5 từ sourceId và chunkIndex"]
    Build --> Upsert["Upsert point mới vào Qdrant"]
    Upsert --> Done["Trả chunksCount"]
```

Point ID ổn định giúp cùng một `sourceId + chunkIndex` không sinh point ngẫu nhiên sau mỗi lần ingest. Nếu đổi model embedding, kể cả model mới vẫn tạo 384 chiều, phải reindex toàn bộ vì không gian vector giữa hai model không tương thích.

## 4. Metadata và phân vùng tài liệu

### 4.1. Payload của ClassResource

```json
{
  "sourceId": "class-resource-123",
  "sourceType": "pdf",
  "resourceId": "123",
  "module": "TRAINING",
  "domain": "class_resource",
  "courseId": "10",
  "classId": "20",
  "visibility": "CLASS",
  "allowedRoles": [
    "ROLE_STUDENT",
    "ROLE_TEACHER",
    "ROLE_TA",
    "ROLE_ADMIN"
  ],
  "chunkIndex": 0,
  "chunkText": "Nội dung chunk...",
  "pageNumber": 1,
  "title": "Giáo trình lớp"
}
```

### 4.2. Payload của LessonResource

```json
{
  "sourceId": "lesson-resource-456",
  "sourceType": "docx",
  "resourceId": "456",
  "module": "TRAINING",
  "domain": "lesson_resource",
  "courseId": "10",
  "sectionId": "30",
  "lessonId": "40",
  "visibility": "COURSE",
  "allowedRoles": [
    "ROLE_STUDENT",
    "ROLE_TEACHER",
    "ROLE_TA",
    "ROLE_ADMIN"
  ],
  "chunkIndex": 0,
  "chunkText": "Nội dung chunk...",
  "headingPath": "Chương 1 > Bài 1",
  "title": "Tài liệu bài học"
}
```

`visibility=CLASS` ngăn tài liệu riêng của một lớp xuất hiện trong scope course hoặc lesson. `visibility=COURSE` cho phép tài liệu lesson được dùng trong phạm vi lesson hoặc toàn khóa học nhưng không làm lộ tài liệu lớp khác.

## 5. Luồng AI Chat dùng scoped RAG

### 5.1. Xác thực context ở Backend

```mermaid
sequenceDiagram
    actor S as Student
    participant FE as Course Player
    participant BE as AiChatController
    participant CTX as StudentLearningAiContextService
    participant DB as MySQL
    participant BUF as Redis và Conversation DB
    participant AI as AI Service

    S->>FE: Đặt câu hỏi trong course hoặc lesson
    FE->>BE: POST /api/v1/ai/chat/stream
    BE->>BE: Xác thực JWT và suy scope STUDENT_ASSISTANT
    BE->>CTX: Resolve courseId, lessonId, retrievalScope
    CTX->>DB: Kiểm tra enrollment của chính user
    CTX->>DB: Kiểm tra EnrollmentPackage còn hiệu lực
    CTX->>DB: Kiểm tra enrollment chưa bị hủy
    CTX->>DB: Suy classId từ enrollment
    CTX->>DB: Kiểm tra class member STUDENT ACTIVE
    CTX->>DB: Kiểm tra lesson thuộc course
    CTX-->>BE: Trusted courseId, classId, lessonId và scope
    BE->>BUF: Kiểm tra conversation cùng context và lấy history
    BE->>AI: POST /chat/stream với role/context tin cậy
```

Frontend không gửi `classId` như bằng chứng phân quyền. Backend tự suy ra `classId` từ enrollment của chính học viên.

### 5.2. Selective RAG trong AI Service

```mermaid
flowchart TD
    Request["ChatStreamRequest"] --> Mode{"retrievalMode"}
    Mode -->|NEVER| Direct["Route DIRECT"]
    Mode -->|ALWAYS| KnowledgeRequired["Route KNOWLEDGE, grounding REQUIRED"]
    Mode -->|AUTO| Router["ChatRouter phân loại intent"]

    Router --> Attachment{"Có file hoặc ảnh?"}
    Attachment -->|Có| DirectAttachment["DIRECT và phân tích attachment"]
    Attachment -->|Không| Route{"Route đã chọn"}

    Route -->|DIRECT| Direct
    Route -->|TOOL| Tool["Gọi Backend Tool cho dữ liệu realtime"]
    Route -->|MEMORY| Memory["Recall long-term memory theo ownerId và scope"]
    Route -->|KNOWLEDGE| Scope{"Student GENERAL?"}

    Scope -->|Có| DirectGeneral["Không gọi Qdrant"]
    Scope -->|Không| Rewrite["Rewrite query theo question và history"]
    Rewrite --> QueryPrefix["Thêm prefix query:"]
    QueryPrefix --> Embed["FastEmbed vector 384d"]
    Embed --> Filters["Ghép role và scope filters"]
    Filters --> Search["Qdrant cosine Top-5, min score 0.65"]
    Search --> Found{"Có chunk phù hợp?"}

    Found -->|Không và REQUIRED| NoData["Trả thông báo chưa có tài liệu và sources rỗng"]
    Found -->|Không và OPTIONAL| DirectFallback["Fallback direct prompt"]
    Found -->|Có| Grounded["Dựng grounded prompt từ chunk"]

    Direct --> Gemini["Gemini streaming"]
    DirectAttachment --> Gemini
    DirectGeneral --> Gemini
    DirectFallback --> Gemini
    Tool --> Gemini
    Memory --> Gemini
    Grounded --> Gemini
    Gemini --> SSE["SSE token chunks"]
    SSE --> Metadata["Metadata route, grounding và citations"]
    Metadata --> Done["event done"]
```

### 5.3. Filter theo retrieval scope

Mọi truy vấn knowledge đều có `allowedRoles` lấy từ JWT ở Backend và bổ sung role `ALL`.

| Retrieval scope | Qdrant filter bắt buộc | Ý nghĩa |
|---|---|---|
| `LESSON_ONLY` | `module=TRAINING`, `courseId`, `lessonId`, `visibility=COURSE`, `allowedRoles` | Chỉ lấy tài liệu đúng lesson trong course đang học |
| `CLASS_MATERIALS` | `module=TRAINING`, `courseId`, `classId`, `visibility=CLASS`, `allowedRoles` | Chỉ lấy tài liệu riêng của lớp học viên |
| `COURSE_MATERIALS` | `module=TRAINING`, `courseId`, `visibility=COURSE`, `allowedRoles` | Lấy học liệu dùng chung của course, loại tài liệu riêng của lớp |
| `GENERAL` | Không gọi Qdrant | Chỉ dùng kiến thức chung của model |

### 5.4. Luồng trả lời và citation

```mermaid
sequenceDiagram
    participant AI as AI Service
    participant EM as LocalRagEmbedder
    participant Q as Qdrant
    participant LLM as Gemini
    participant BE as Spring Boot Backend
    participant FE as Frontend

    AI->>AI: Rewrite câu hỏi nếu route KNOWLEDGE
    AI->>EM: embed_query với prefix query
    EM-->>AI: Vector 384 chiều
    AI->>Q: Query cosine kèm exact filters
    Q-->>AI: Top-5 chunks đạt score tối thiểu
    AI->>AI: Dựng grounded prompt
    AI->>LLM: Prompt, history và system instruction
    loop Từng token
        LLM-->>AI: Text chunk
        AI-->>BE: SSE data
        BE-->>FE: SSE data
    end
    AI-->>BE: SSE metadata chứa sources
    BE-->>FE: Citation title, page, score và scope IDs
    AI-->>BE: event done
    BE->>BE: Lưu câu trả lời hoàn chỉnh vào conversation
```

Citation chỉ được tạo từ những point thực sự vượt qua filter và score threshold. Metadata citation có thể gồm `sourceId`, `chunkId`, `title`, `sourceType`, `score`, `courseId`, `classId`, `lessonId`, `sectionId` và `pageNumber`.

## 6. Luồng RAG sinh Quiz và Assignment

### 6.1. Kết hợp tài liệu lớp và upload tạm

```mermaid
sequenceDiagram
    actor T as Teacher hoặc Admin
    participant FE as Assessment Authoring UI
    participant BE as AiAssessmentAuthoringService
    participant DB as MySQL
    participant AI as AssessmentGenerator
    participant R as Retriever
    participant Q as Qdrant
    participant LLM as Gemini
    participant Redis

    T->>FE: Chọn lesson và lớp
    FE->>BE: GET ai-assessment-materials
    BE->>DB: Kiểm tra course, class, quyền và resource status
    DB-->>BE: Chỉ resource có thể dùng cho AI
    BE-->>FE: Danh sách tài liệu và ragStatus

    T->>FE: Chọn tối đa 10 resource và tối đa 3 file upload
    FE->>BE: POST ai-assessment-drafts multipart
    BE->>BE: Kiểm tra owner/instructor và class Teacher hoặc TA ACTIVE
    BE->>DB: Kiểm tra resource đúng lớp và READY
    BE->>AI: lessonContent, ragSourceIds, trusted scope, role và upload base64

    loop Mỗi ragSourceId
        AI->>R: Retrieve query kiến thức trọng tâm
        R->>Q: Filter sourceId, classId, courseId và allowedRoles
        Q-->>R: Tối đa 8 chunk, threshold 0.0
        R-->>AI: Các chunk đúng source
    end

    alt Có source không trả nội dung
        AI-->>BE: 422 fail-closed
        BE-->>FE: Không tạo draft
    else Đủ source
        AI->>AI: Deduplicate chunk
        AI->>AI: Extract upload trong RAM, không ghi Qdrant
        AI->>AI: Ghép lesson, RAG và upload, giới hạn 80000 ký tự
        AI->>LLM: Sinh structured Quiz hoặc Assignment
        LLM-->>AI: Pydantic validated output và sourceIds
        AI->>AI: Loại citation không thuộc nguồn được cấp
        AI-->>BE: Draft có cấu trúc
        BE->>Redis: Lưu draft theo owner, TTL 15 phút
        BE-->>FE: Hiển thị màn hình review
        T->>FE: Sửa title, câu hỏi, options và đáp án đúng
        FE->>BE: Apply draft
        BE->>DB: Tạo Quiz, Question và QuestionOption thật
    end
```

Tài liệu lớp đã ingest không được tải lại toàn bộ lên model. Request chỉ mang `ragSourceIds`; AI Service truy xuất các chunk cần thiết từ Qdrant. File upload dùng một lần được extract trong RAM và không upsert vào Qdrant.

### 6.2. So sánh retrieval của chat và assessment

| Thuộc tính | AI Chat | AI Assessment |
|---|---|---|
| Query | Câu hỏi đã rewrite | Tiêu đề lesson và yêu cầu tìm kiến thức trọng tâm |
| Số kết quả | Tối đa 5 chunk | Tối đa 8 chunk trên mỗi source |
| Score threshold | `0.65` mặc định | `0.0` để lấy đủ nội dung của source giáo viên chủ động chọn |
| Filter | Role và retrieval scope | `sourceId + classId + courseId + role` |
| Không có chunk | Grounding REQUIRED fail; OPTIONAL fallback direct | Fail-closed toàn request |
| Context limit | Theo context builder và history | Tổng source text tối đa 80.000 ký tự |
| Citation | Trả trong SSE metadata | `sourceIds` trên từng câu hỏi |

## 7. Vòng đời ClassResource RAG

```mermaid
stateDiagram-v2
    [*] --> PENDING: Tạo resource hoặc retry
    PENDING --> PROCESSING: Listener bắt đầu ingest
    PROCESSING --> READY: Qdrant upsert thành công
    PROCESSING --> FAILED: Extract, OCR, embed hoặc Qdrant lỗi
    FAILED --> PENDING: Giáo viên bấm Thử lại
    READY --> [*]: Resource bị xóa
    FAILED --> [*]: Resource bị xóa
```

Quy tắc hiện tại:

- Chỉ `ClassResource` lưu `ragStatus`, `ragChunksCount` và `ragError` trong MySQL.
- Chỉ resource `READY` được chọn làm nguồn sinh assessment.
- Endpoint retry chỉ chấp nhận resource `FAILED`, tránh tạo nhiều ingestion đồng thời.
- Khi resource bị xóa, Backend gọi `DELETE /rag/sources/{sourceId}` để xóa toàn bộ point theo source.
- `LessonResource` được ingest/xóa bằng event tương tự nhưng chưa có trạng thái RAG riêng để hiển thị trên UI.

## 8. Long-term memory và conversation history

Long-term memory dùng local embedding 384 chiều nhưng là collection khác với kho tài liệu RAG.

```mermaid
flowchart LR
    MemoryText["Memory content"] --> DocEmbed["Local embed document 384d"]
    DocEmbed --> MemoryCollection[("long_term_memory_local")]
    Question["Chat question"] --> QueryEmbed["Local embed query 384d"]
    QueryEmbed --> MemoryCollection
    Owner["ownerId và scope bắt buộc"] --> MemoryCollection
    MemoryCollection --> Recall["Top semantic memories"]
    Recall --> Prompt["Memory-grounded prompt"]
```

Không được nhầm ba loại dữ liệu:

| Dữ liệu | Nơi lưu | Mục đích |
|---|---|---|
| File gốc | MinIO | Download, quản lý tài liệu và ingest lại |
| Metadata nghiệp vụ và conversation | MySQL | Quyền, trạng thái, owner, course/class/lesson và lịch sử bền vững |
| Chat buffer và assessment draft | Redis | History ngắn hạn và draft TTL |
| Document chunks | Qdrant `management_knowledge_local` | Scoped semantic retrieval |
| Long-term memories | Qdrant `long_term_memory_local` | Recall theo `ownerId + scope` |
| Public catalog vectors | Qdrant `public_catalog_local_*` | Semantic search khóa học/danh mục công khai |

Chat history không tự động đồng nghĩa với long-term memory. Conversation được lưu trong MySQL/Redis; chỉ dữ liệu được ghi qua memory flow mới nằm trong `long_term_memory_local`.

## 9. Xử lý lỗi và chống rò rỉ dữ liệu

```mermaid
flowchart TD
    Operation["RAG operation"] --> Guard{"Kiểm tra bảo mật và dữ liệu"}
    Guard -->|JWT hoặc quyền sai| Forbidden["Backend trả 401 hoặc 403"]
    Guard -->|Course, class hoặc lesson sai| ScopeError["Backend trả 400, 403 hoặc 404"]
    Guard -->|Resource chưa READY| NotReady["Không cho dùng để sinh assessment"]
    Guard -->|Hợp lệ| AIRequest["Gọi AI Service bằng internal token"]

    AIRequest --> Validate{"Pydantic hợp lệ?"}
    Validate -->|Không| Unprocessable["422"]
    Validate -->|Có| Process["Extract, embed hoặc retrieve"]
    Process -->|Ingestion lỗi| Failed["ClassResource chuyển FAILED"]
    Process -->|Qdrant chat lỗi| Empty["Knowledge rỗng, không lộ dữ liệu"]
    Empty --> Grounding{"Grounding mode"}
    Grounding -->|REQUIRED| SafeNoData["Thông báo chưa có nguồn tin cậy"]
    Grounding -->|OPTIONAL| SafeFallback["Trả lời direct không gắn citation giả"]
    Process -->|Assessment thiếu source| AssessmentFail["Fail-closed, không tạo draft"]
    Process -->|Thành công| Result["Grounded result và citation hợp lệ"]
```

Các lớp bảo vệ chính:

1. Frontend không quyết định quyền truy cập Qdrant.
2. Backend xác thực user và xây trusted context.
3. AI Service xác thực `X-Internal-Token` và schema Pydantic.
4. Qdrant search dùng exact payload filter cùng cosine similarity.
5. Chat chỉ trả citation từ kết quả retrieval thật.
6. Assessment loại `sourceIds` lạ do model sinh.
7. Log không ghi nội dung prompt, tài liệu hoặc dữ liệu cá nhân nhạy cảm.

## 10. Endpoint liên quan

### 10.1. API Frontend gọi Backend

| Method | Endpoint | Vai trò trong RAG |
|---|---|---|
| `POST` | `/api/v1/classes/{classId}/resources` | Tạo metadata tài liệu lớp và phát event ingestion |
| `GET` | `/api/v1/classes/{classId}/resources` | Xem resource và trạng thái RAG |
| `POST` | `/api/v1/classes/{classId}/resources/{resourceId}/rag/retry` | Retry resource `FAILED` |
| `DELETE` | `/api/v1/classes/{classId}/resources/{resourceId}` | Xóa resource và vector theo sourceId |
| `POST` | `/api/v1/ai/chat/stream` | Scoped chat dạng SSE |
| `POST` | `/api/v1/ai/chat/file/stream` | Chat với file upload dùng một lần |
| `GET` | `/api/v1/authoring/lessons/{lessonId}/ai-assessment-materials` | Lấy nguồn RAG lớp cho assessment |
| `POST` | `/api/v1/authoring/lessons/{lessonId}/ai-assessment-drafts` | Sinh draft từ RAG và upload tạm |

### 10.2. API nội bộ Backend gọi AI Service

| Method | Endpoint | Vai trò |
|---|---|---|
| `POST` | `/rag/ingest` | Extract, chunk, embed và upsert đồng bộ |
| `DELETE` | `/rag/sources/{sourceId}` | Xóa mọi vector của một nguồn |
| `POST` | `/rag/search` | Semantic search nội bộ có role filter |
| `POST` | `/chat/stream` | Selective RAG và SSE generation |
| `POST` | `/assessments/generate` | Scoped retrieval và structured assessment generation |

## 11. Tóm tắt ngắn để báo cáo

```mermaid
flowchart LR
    Upload["Upload tài liệu"] --> Extract["Extract hoặc OCR thành text"]
    Extract --> Chunk["Chunk 2000, overlap 200"]
    Chunk --> Embed["FastEmbed local 384d"]
    Embed --> Store["Qdrant và metadata scope"]
    Question["Câu hỏi hoặc yêu cầu sinh Quiz"] --> Validate["Backend xác thực quyền và context"]
    Validate --> Retrieve["Embed query và scoped Top-K retrieval"]
    Store --> Retrieve
    Retrieve --> Generate["Gemini sinh câu trả lời hoặc assessment"]
    Generate --> Output["SSE citation hoặc structured Quiz"]
```

Có thể trình bày ngắn gọn:

> AILMS ingest tài liệu một lần bằng pipeline Extract/OCR → Chunk → FastEmbed local 384 chiều → Qdrant. Khi học viên chat hoặc giáo viên sinh Quiz, hệ thống không gửi lại toàn bộ kho tài liệu mà chỉ embedding câu hỏi, lọc vector theo role/course/class/lesson, lấy các chunk liên quan rồi mới đưa context cho Gemini. Backend giữ toàn bộ quyền nghiệp vụ, AI Service chỉ xử lý request nội bộ và Qdrant chỉ đóng vai trò semantic retrieval.

## 12. Source of truth trong mã nguồn

- AI ingestion: [`../ai-service/app/rag/ingestion_pipeline.py`](../ai-service/app/rag/ingestion_pipeline.py)
- Extractors: [`../ai-service/app/rag/extractors/`](../ai-service/app/rag/extractors/)
- Local embedder: [`../ai-service/app/catalog/local_embedder.py`](../ai-service/app/catalog/local_embedder.py)
- RAG embedder adapter: [`../ai-service/app/rag/embedder.py`](../ai-service/app/rag/embedder.py)
- Retriever: [`../ai-service/app/rag/retriever.py`](../ai-service/app/rag/retriever.py)
- Qdrant store: [`../ai-service/app/vector_store/qdrant_store.py`](../ai-service/app/vector_store/qdrant_store.py)
- Chat routing: [`../ai-service/app/routers/chat.py`](../ai-service/app/routers/chat.py)
- Assessment generation: [`../ai-service/app/services/assessment_generator.py`](../ai-service/app/services/assessment_generator.py)
- Backend class ingestion listener: [`../backend/ailms/src/main/java/com/ailms/event/ClassResourceKnowledgeSyncListener.java`](../backend/ailms/src/main/java/com/ailms/event/ClassResourceKnowledgeSyncListener.java)
- Backend lesson ingestion listener: [`../backend/ailms/src/main/java/com/ailms/event/LessonResourceKnowledgeSyncListener.java`](../backend/ailms/src/main/java/com/ailms/event/LessonResourceKnowledgeSyncListener.java)
- Student scope validation: [`../backend/ailms/src/main/java/com/ailms/service/imp/StudentLearningAiContextService.java`](../backend/ailms/src/main/java/com/ailms/service/imp/StudentLearningAiContextService.java)

