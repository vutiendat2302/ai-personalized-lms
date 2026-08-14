# 🎓 AI-Personalized LMS (Next-Gen Intelligent Learning Ecosystem)

<div align="center">

![Java 25](https://img.shields.io/badge/Java-25-orange?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x%20%2F%204.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash-8E75C2?style=for-the-badge&logo=google&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC2626?style=for-the-badge&logo=qdrant&logoColor=white)
![Meilisearch](https://img.shields.io/badge/Meilisearch-v1.15-FF4088?style=for-the-badge&logo=meilisearch&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-S3_Storage-C72C48?style=for-the-badge&logo=minio&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

<p align="center">
  <b>Hệ thống Quản lý Học tập Thông minh Tích hợp Trí tuệ Nhân tạo Cá nhân hóa Lộ trình Học</b>
  <br />
  <i>Enterprise-grade Smart Learning Management System featuring Real-time AI Chat Streaming, RAG Engine, Multi-portal RBAC, Distributed Full-text Search, and S3-Compatible Object Storage.</i>
</p>

[Tổng quan kiến trúc](#-1-tổng-quan-kiến-trúc-hệ-thống) •
[Hạ tầng AI & RAG](#-2-hạ-tầng-ai--rag-engine-microservice) •
[Công cụ Tìm kiếm & Lưu trữ](#-3-hệ-thống-tìm-kiếm--lưu-trữ-phân-tán) •
[Bảo mật & Phân quyền](#-4-kiến-trúc-bảo-mật--quản-trị-dữ-liệu) •
[Nghiệp vụ cốt lõi](#-5-phân-hệ-nghiệp-vụ-doanh-nghiệp--lms) •
[Khởi chạy nhanh](#-6-hướng-dẫn-khởi-chạy-nhanh-với-docker) •
[Phát triển cục bộ](#-7-hướng-dẫn-phát-triển-cục-bộ-local-development)

</div>

---

## 1. Tổng quan Kiến trúc Hệ thống

Hệ thống được thiết kế theo mô hình **Microservices & Event-Driven Architecture**, phân tách độc lập giữa tầng giao diện (**Frontend SPA**), tầng điều phối nghiệp vụ lõi (**Backend Core**), và tầng trí tuệ nhân tạo chuyên biệt (**AI Microservice**). Toàn bộ hạ tầng phụ trợ (Cơ sở dữ liệu quan hệ, Bộ nhớ đệm phân tán, Vector Database, Search Engine và Object Storage) được điều phối đồng bộ qua Docker Container Network.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Presentation Tier)"]
        FE["Frontend SPA (React 19 + TypeScript + Vite + Tailwind CSS + shadcn UI)"]
        MultiPortal["Multi-Portal Workspace (Admin / Instructor / Student Portal)"]
        FE --- MultiPortal
    end

    subgraph GatewayLayer ["Reverse Proxy & Ingress"]
        Nginx["Nginx Reverse Proxy (Port 80)"]
    end

    subgraph CoreBackend ["Core Business Engine (Backend Tier)"]
        SB["Spring Boot 3.x / Java 25"]
        Security["Spring Security 6 + JWT Stateless"]
        EventBus["Spring Event Bus (Audit Log & Async Events)"]
        Snowflake["Snowflake ID Generator (64-bit Distributed IDs)"]
        BaseLayer["Generic Base Service / Specification Layer"]

        SB --- Security
        SB --- EventBus
        SB --- Snowflake
        SB --- BaseLayer
    end

    subgraph AIService ["AI Microservice (Intelligence Tier)"]
        FastAPI["FastAPI Python 3.12 (Zero-Trust Internal API)"]
        LLM["Google Gemini 3.5 Flash Provider"]
        RAG["RAG Ingestion Pipeline + OCR Vision Extractor"]
        Memory["Long-Term Memory Engine"]
        ToolCalling["Gemini Function Calling / Tool Calling"]

        FastAPI --- LLM
        FastAPI --- RAG
        FastAPI --- Memory
        FastAPI --- ToolCalling
    end

    subgraph DataStorage ["Data & Storage Infrastructure"]
        MySQL[("MySQL 8.4 (InnoDB 3NF Storage)")]
        Redis[("Redis 7 (Token Blacklist & OTP TTL)")]
        Meili[("Meilisearch v1.15 (Full-Text Search Engine)")]
        Qdrant[("Qdrant Vector DB (768-dim Embeddings)")]
        MinIO[("MinIO S3 (Binary Object Storage)")]
    end

    FE -->|HTTP / REST API| Nginx
    Nginx -->|Reverse Proxy /api/*| SB
    FE <-->|Server-Sent Events / SSE Stream| SB

    SB -->|X-Internal-Token / Private Loopback| FastAPI
    SB -->|Spring Data JPA / HikariCP| MySQL
    SB -->|Jedis / Lettuce Client| Redis
    SB -->|REST Client / Auto Index Sync| Meili
    SB -->|Amazon S3 SDK / Presigned URLs| MinIO

    FastAPI -->|Semantic Search & Recall| Qdrant
    FastAPI -->|Extract Document Content| MinIO
```

---

## 2. Hạ tầng AI & RAG Engine (Microservice)

Microservice AI vận hành hoàn toàn độc lập trên nền tảng **Python 3.12** và **FastAPI**, tuân thủ nguyên lý **Zero-Trust Security**: Không nhận kết nối trực tiếp từ Internet/Frontend và không truy cập trực tiếp MySQL nghiệp vụ; mọi giao tiếp đều phải đi qua Backend Core với header xác thực nội bộ `X-Internal-Token`.

### 2.1 Luồng Xử lý AI Chat Streaming & Dynamic Context (SSE)

```mermaid
sequenceDiagram
    autonumber
    actor User as Học viên / Admin
    participant FE as Frontend Client
    participant BE as Spring Boot Backend
    participant AI as FastAPI AI Service
    participant Qdrant as Qdrant Vector Store
    participant Gemini as Google Gemini 3.5 Flash

    User->>FE: Gửi câu hỏi / Yêu cầu tư vấn
    FE->>BE: POST /api/v1/ai/chat/stream (Kèm JWT)
    BE->>BE: Xác thực quyền & Phân giải ngữ cảnh (Role, Scope)
    BE->>AI: POST /chat/stream (Kèm X-Internal-Token & Query Context)

    AI->>AI: Query Rewriting & Phân tích Ý định
    alt Cần tra cứu tài liệu học tập (RAG)
        AI->>Qdrant: Similarity Search (Embedding vector 768-dim)
        Qdrant-->>AI: Top-K Chunks tài liệu phù hợp
    else Cần truy vấn dữ liệu nghiệp vụ (Tool Calling)
        AI->>Gemini: Parse Function Call
        Gemini-->>AI: Call tool: search_students / get_employee_contracts
        AI->>BE: Callback nội bộ truy vấn dữ liệu nghiệp vụ (đã ẩn thông tin nhạy cảm)
        BE-->>AI: Kết quả truy vấn an toàn
    end

    AI->>Gemini: Stream Prompt + System Instructions + Grounding Context
    loop Server-Sent Events (SSE)
        Gemini-->>AI: Chunk Token Stream
        AI-->>BE: event: token | data: {...}
        BE-->>FE: Stream Chunk về Trình duyệt (Markdown Render)
        FE-->>User: Hiển thị thời gian thực (Typing Effect)
    end
    AI-->>BE: event: done (Usage Log, Latency, Token Count)
    BE->>BE: Ghi nhận AI Usage Metrics
```

### 2.2 Quy trình RAG Document Ingestion Pipeline

```mermaid
flowchart LR
    Doc["Tài liệu tải lên (PDF / DOCX / TXT / Scan Image)"] --> MinIO[("MinIO S3 Storage")]
    MinIO --> Trigger["Backend Event Trigger (Snowflake sourceId)"]
    Trigger --> Extractor["BaseExtractor Engine"]

    subgraph Extractors ["Multi-Modal Extractors"]
        PDF["PDF Extractor (PyMuPDF)"]
        DOCX["DOCX Extractor"]
        OCR["Gemini Vision OCR (Scan/Image Fallback)"]
    end

    Extractor --> Extractors
    Extractors --> Chunker["Contextual Chunker (Bảo toàn Heading & Metadata trang)"]
    Chunker --> Embedder["Gemini Embedding 2 (768-dim Vector)"]

    subgraph VectorCollections ["Qdrant Vector Database"]
        Col1[("management_knowledge")]
        Col2[("long_term_memory")]
        Col3[("public_catalog_local_*")]
    end

    Embedder --> VectorCollections
```

- **Idempotent Vector Management:** Sử dụng Snowflake ID từ MySQL làm `sourceId` trên Qdrant. Khi tài liệu được tái xuất bản hoặc cập nhật, pipeline tự động xóa các vector cũ trước khi upsert vector mới, ngăn ngừa triệt để dữ liệu trùng lặp.
- **Local Embedding cho Public Catalog:** Sử dụng mô hình `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` cục bộ cho việc gợi ý và tìm kiếm ngữ nghĩa danh mục công khai, tối ưu chi phí và không phụ thuộc vào quota API bên ngoài.

---

## 3. Hệ thống Tìm kiếm & Lưu trữ Phân tán

### 3.1 Động cơ Tìm kiếm Toàn văn bản Meilisearch & High Availability Fallback

Hệ thống tích hợp **Meilisearch v1.15** làm Search Engine độc lập cho 4 index chính: `courses`, `categories`, `classes`, `files`. Để đảm bảo tính sẵn sàng cao (**High Availability**), toàn bộ các Service tìm kiếm được trang bị cơ chế **Fallback trong suốt** về MySQL JPA Specification.

```mermaid
flowchart TD
    Req["Yêu cầu tìm kiếm từ Client (Keyword, Filters, Sort, Page)"] --> Svc["Meilisearch Search Service"]
    Svc --> Check{"Meilisearch khả dụng & Index sẵn sàng?"}

    Check -->|Có / Sẵn sàng| MeiliExec["Thực thi Full-text Search trên Meilisearch Engine"]
    MeiliExec --> ResultMeili["Trả về danh sách kết quả (Độ trễ < 15ms)"]

    Check -->|Không / Lỗi kết nối / Timeout| FallbackLog["Ghi nhận Warning Log & Kích hoạt Fallback"]
    FallbackLog --> JPASpec["Chuyển đổi tham số sang MySQL JPA Specification (Dynamic Criteria)"]
    JPASpec --> MySQLQuery["Thực thi truy vấn SQL trên MySQL 8.4 (B-Tree Index)"]
    MySQLQuery --> ResultMySQL["Trả về PageResponse chuẩn hóa"]

    ResultMeili --> Response["Chuẩn hóa ApiResponse<PageResponse<T>> về Frontend"]
    ResultMySQL --> Response
```

### 3.2 Kiến trúc Lưu trữ Tệp Tin 3 Tầng (Object Storage + Presigned URLs)

Tách biệt hoàn toàn luồng dữ liệu nhị phân (Binary Streams) khỏi cơ sở dữ liệu quan hệ, giúp máy chủ Backend không bị nghẽn I/O khi người dùng tải/xem học liệu dung lượng lớn.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Trình duyệt (Frontend)
    participant Ctrl as File Controller
    participant FileSvc as IFileService (Facade)
    participant Storage as MinioFileStorageService
    participant MetaSvc as FileMetadataService
    participant MinIO as MinIO S3 Server
    participant DB as MySQL Database

    Note over Client,MinIO: GIAI ĐOẠN 1: TẢI TỆP LÊN (UPLOAD)
    Client->>Ctrl: POST /api/v1/files/upload (MultipartFile, FileType)
    Ctrl->>FileSvc: uploadFile(file, fileType)
    FileSvc->>Storage: upload(fileKey, inputStream, size)
    Storage->>MinIO: Lưu trữ Blob nhị phân
    MinIO-->>Storage: Upload Success
    FileSvc->>MetaSvc: createMetadata(fileKey, originalName, size, mimeType)
    MetaSvc->>DB: Lưu bản ghi vào bảng file_metadata (status=ACTIVE)
    DB-->>MetaSvc: Metadata Saved
    FileSvc-->>Ctrl: FileMetadataResponse
    Ctrl-->>Client: 201 Created (Trả về fileKey)

    Note over Client,MinIO: GIAI ĐOẠN 2: LẤY LIÊN KẾT TẢI/XEM (PRESIGNED URL)
    Client->>Ctrl: GET /api/v1/files/{fileKey}/download-url
    Ctrl->>FileSvc: getDownloadUrl(fileKey)
    FileSvc->>MetaSvc: getByFileKey(fileKey)
    MetaSvc->>DB: Truy vấn metadata (Kiểm tra status = ACTIVE)
    DB-->>MetaSvc: Record Active
    FileSvc->>Storage: generatePresignedUrl(fileKey, expiry=1h)
    Storage->>MinIO: Ký URL tạm thời (Presigned URL)
    MinIO-->>Storage: Presigned S3 URL
    FileSvc-->>Ctrl: Presigned URL String
    Ctrl-->>Client: 200 OK (Trả URL)
    Client->>MinIO: Truy cập tải tệp trực tiếp từ MinIO (Bypass Backend Server)
```

---

## 4. Kiến trúc Bảo mật & Quản trị Dữ liệu

### 4.1 Mô hình Phân quyền Hai tầng (RBAC 2-Tier Security)

Hệ thống kết hợp giữa **Role-Based Access Control** và **Fine-Grained Permissions** nhằm kiểm soát quyền truy cập chi tiết đến từng hành vi nghiệp vụ.

```mermaid
erDiagram
    USER ||--o{ USER_ROLE : "gán vai trò"
    ROLE ||--o{ USER_ROLE : "thuộc về"
    ROLE ||--o{ ROLE_PERMISSION : "chứa các quyền"
    PERMISSION ||--o{ ROLE_PERMISSION : "được cấu hình vào"
    USER ||--o{ AUDIT_LOG : "sinh nhật ký kiểm toán"

    USER {
        bigint id PK "Snowflake ID 64-bit"
        string username "Định danh đăng nhập"
        string email "Email định danh duy nhất"
        string password_hash "BCrypt Encrypted"
        enum status "ACTIVE, PENDING, LOCKED, DELETED"
    }

    ROLE {
        bigint id PK "Snowflake ID"
        string name "Tên hiển thị vai trò"
        string code "ROLE_ADMIN, ROLE_TEACHER,..."
        boolean is_system_role "Bảo vệ vai trò hệ thống"
    }

    PERMISSION {
        bigint id PK "Snowflake ID"
        string entity "user, course, contract, salary,..."
        string action "create, read, update, delete, approve,..."
    }

    USER_ROLE {
        bigint id PK
        bigint user_id FK
        bigint role_id FK
        datetime expired_at "Hạn hiệu lực vai trò"
    }

    ROLE_PERMISSION {
        bigint id PK
        bigint role_id FK
        bigint permission_id FK
    }

    AUDIT_LOG {
        bigint id PK
        bigint actor_id FK "Người thực hiện"
        string action "CREATE, UPDATE, DELETE, APPROVE"
        string entity_type "Tên đối tượng bị tác động"
        string entity_id "ID đối tượng"
        json old_value "Trạng thái trước biến đổi"
        json new_value "Trạng thái sau biến đổi"
        string ip_address "Địa chỉ IP thực hiện"
        datetime created_at
    }
```

### 4.2 Vòng đời Xác thực JWT Stateless & Redis Token Blacklist

```mermaid
flowchart TD
    Login["Client gửi credentials đến /api/v1/auth/login"] --> AuthMgr["Spring AuthenticationManager"]
    AuthMgr --> CustomUser["CustomUserDetailsService (Load User + Roles + Permissions)"]
    CustomUser --> PassVerify{"BCryptPasswordEncoder khớp mật khẩu?"}

    PassVerify -->|Không| Err401["Ném BadCredentialsException (401 Unauthorized)"]
    PassVerify -->|Khớp| StatusCheck{"User status = ACTIVE?"}

    StatusCheck -->|Khóa/Pending| ErrStatus["Ném Disabled/LockedException (403 Forbidden)"]
    StatusCheck -->|Hợp lệ| TokenGen["JwtUtils sinh cặp Token"]

    TokenGen --> AccTok["Access Token (Thời hạn ngắn -> Lưu Memory Client)"]
    TokenGen --> RefTok["Refresh Token (Thời hạn dài -> Lưu HttpOnly Cookie)"]

    AccTok --> ClientStore["Client thực hiện gọi các API bảo vệ"]

    subgraph ProtectedAPI ["Bảo vệ Endpoint với JwtAuthFilter"]
        ReqFilter["JwtAuthFilter chặn Request"] --> CheckBlacklist{"Token có trong Redis Blacklist?"}
        CheckBlacklist -->|Có trong Blacklist| DenyTok["Chặn truy cập (401 Token Revoked)"]
        CheckBlacklist -->|Không| ValidSig{"Chữ ký & Thời hạn JWT hợp lệ?"}
        ValidSig -->|Hợp lệ| SetSecCtx["Thiết lập SecurityContextHolder (Authorities)"]
        ValidSig -->|Hết hạn| DenyExp["Yêu cầu Refresh Token"]
        SetSecCtx --> ControllerExec["Thực thi Controller Method (@PreAuthorize)"]
    end

    subgraph LogoutProcess ["Quy trình Đăng xuất / Thu hồi Quyền"]
        LogoutReq["User bấm Logout hoặc Đổi mật khẩu"] --> AddBlacklist["Đẩy Access Token vào Redis Blacklist (TTL = Thời gian sống còn lại)"]
        AddBlacklist --> ClearCookie["Xóa Refresh Token Cookie"]
        ClearCookie --> AuditLogout["Ghi nhận Audit Log: LOGOUT"]
    end
```

---

## 💼 5. Phân hệ Nghiệp vụ Doanh nghiệp & LMS

### 5.1 Quy trình Phê duyệt Đa cấp (Approval Workflow State Machine)

Áp dụng mô hình máy trạng thái quản lý việc phê duyệt: Xuất bản khóa học, Phê duyệt hợp đồng nhân sự, và Đơn xin nghỉ phép.

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Khởi tạo yêu cầu
    DRAFT --> PENDING: Gửi yêu cầu phê duyệt

    note right of PENDING
        Khóa toàn bộ quyền sửa đổi dữ liệu.
        Ràng buộc: Requester != Approver (Segregation of Duties).
    end note

    PENDING --> APPROVED: Người có thẩm quyền phê duyệt
    PENDING --> REJECTED: Người có thẩm quyền từ chối (Kèm lý do)
    PENDING --> CANCELLED: Người tạo hủy yêu cầu

    APPROVED --> [*]: Kích hoạt trạng thái nghiệp vụ (ACTIVE/PUBLISHED)
    REJECTED --> DRAFT: Sửa đổi nội dung theo phản hồi
    CANCELLED --> [*]: Kết thúc luồng
```

### 5.2 Chu trình Thanh toán Idempotent & Kích hoạt Học tập (PayPal Sandbox)

```mermaid
sequenceDiagram
    autonumber
    actor S as Học viên
    participant FE as Frontend Client
    participant BE as Spring Boot Backend
    participant PayPal as PayPal Sandbox API
    participant DB as MySQL Database
    participant MinIO as MinIO Storage

    S->>FE: Chọn gói học (Self-Study, 1-on-1, Group, Combo) & Áp dụng Voucher
    FE->>BE: POST /api/v1/orders/checkout
    BE->>BE: Kiểm tra tính hợp lệ Voucher & Tính tổng tiền
    BE->>PayPal: Create Order (Intent: CAPTURE, Currency: USD)
    PayPal-->>BE: Trả về PayPal Order ID & Approve Link
    BE->>DB: Lưu bản ghi Order (status=PENDING)
    BE-->>FE: Trả về Approve URL

    FE->>S: Chuyển hướng sang giao diện PayPal Sandbox
    S->>PayPal: Xác thực & Đồng ý thanh toán
    PayPal-->>FE: Chuyển hướng về Frontend Return URL (?token=ORDER_ID)

    FE->>BE: POST /api/v1/orders/capture (paypalOrderId)
    BE->>BE: Khóa giao dịch phân tán (Idempotency Lock)
    BE->>PayPal: Capture Order Payment
    PayPal-->>BE: Payment Status: COMPLETED

    BE->>DB: UPDATE order (status=PAID), Kích hoạt Enrollment học tập
    BE->>BE: Sinh Hóa đơn điện tử PDF (Invoice Generator)
    BE->>MinIO: Lưu trữ tệp PDF Hóa đơn
    BE->>DB: Lưu Metadata hóa đơn liên kết đơn hàng
    BE-->>FE: 200 OK (Thanh toán thành công)
    FE-->>S: Hiển thị màn hình thành công & Cung cấp nút Tải hóa đơn PDF
```

---

## 6. Hướng dẫn Khởi chạy Nhanh với Docker

Hệ thống cung cấp sẵn cấu hình **Docker Compose** hoàn chỉnh, tự động điều phối 7 dịch vụ độc lập trong cùng một mạng ảo an toàn.

### 6.1 Yêu cầu tiên quyết
- Đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) hoặc Docker Engine (24.0+) kèm Docker Compose v2.

### 6.2 Các bước thực hiện

```bash
# 1. Clone repository về máy
git clone https://github.com/vutiendat2302/ai-personalized-lms.git
cd ai-personalized-lms

# 2. Thiết lập biến môi trường từ mẫu
cp .env.example .env
```

Mở file `.env` và cập nhật các thông số cần thiết:
```dotenv
# Khóa API Google Gemini (Lấy từ https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Cấu hình tài khoản gửi Email thông báo (Gmail App Password)
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Cấu hình PayPal Sandbox (Tùy chọn cho thanh toán trực tuyến)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

```bash
# 3. Khởi chạy toàn bộ hệ thống bằng Docker Compose
docker compose up --build -d

# 4. Kiểm tra trạng thái hoạt động của các container
docker compose ps
```

---

## 7. Hướng dẫn Phát triển Cục bộ (Local Development)

Trong trường hợp cần phát triển tính năng mới hoặc debug từng module độc lập:

### Bước 1: Khởi động các hạ tầng lưu trữ phụ trợ
```bash
docker compose up -d mysql redis minio minio-init meilisearch qdrant
```

### Bước 2: Chạy Microservice AI (Python FastAPI)
```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate  # Trên Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Bước 3: Chạy Backend Core (Spring Boot - Java 25)
```bash
cd backend/ailms
./mvnw spring-boot:run
```

### Bước 4: Chạy Frontend SPA (React 19 + Vite)
```bash
cd frontend/ailms-frontend
npm install
npm run dev
```

---

## 8. Danh sách Dịch vụ & Cổng truy cập

| Thành phần | Cổng Container | Địa chỉ cục bộ / URL | Mô tả chức năng |
| :--- | :---: | :--- | :--- |
| **Frontend Web App** | `80` | `http://localhost` (Docker) / `http://localhost:5173` (Dev) | Single Page Application đa phân hệ giao diện |
| **Backend REST API** | `8080` | `http://localhost:8080/api/v1` | Cổng API trung tâm của toàn bộ hệ thống |
| **AI Microservice** | `8000` | `http://127.0.0.1:8000` *(Internal Only)* | Xử lý LLM Streaming, RAG và Vector Embedding |
| **MinIO Web Console** | `9001` | `http://localhost:9001` *(User: `minioadmin` / Pass: `minioadmin123`)* | Bảng điều khiển quản lý Object Storage S3 |
| **Meilisearch Engine** | `7700` | `http://localhost:7700` | REST API công cụ tìm kiếm toàn văn bản |
| **Qdrant Vector DB** | `6333` | `http://localhost:6333/dashboard` | Bảng điều khiển trực quan hóa Vector Collections |
| **MySQL Server** | `3306` | `localhost:3306` *(Database: `ailms`)* | Cơ sở dữ liệu quan hệ nghiệp vụ |
| **Redis Server** | `6379` | `localhost:6379` | Bộ nhớ đệm phân tán & Quản lý Token Blacklist |

---

## 9. Tài khoản Mặc định & Dữ liệu Phát triển (Seed Data)

Khi biến môi trường `SPRING_PROFILES_ACTIVE=seed` được kích hoạt, hệ thống tự động khởi tạo dữ liệu mẫu:

| Vai trò (Role) | Email tài khoản | Mật khẩu mặc định | Không gian truy cập tương ứng |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@ailms.com` | `Password@123` | Toàn quyền quản trị hệ thống (`/admin`) |
| **HR Manager** | `hr@ailms.com` | `Password@123` | Quản lý hồ sơ nhân sự, hợp đồng, chấm công |
| **Teacher / Giảng viên** | `teacher@ailms.com` | `Password@123` | Quản lý học liệu, soạn bài, nhận lớp (`/teacher`) |
| **Teaching Assistant** | `ta@ailms.com` | `Password@123` | Nhận lớp hỗ trợ, đánh giá buổi học trực tuyến |
| **Student / Học viên** | `student@ailms.com` | `Password@123` | Không gian học tập cá nhân hóa (`/student`) |

---

## 10. Kiểm thử & Đảm bảo Chất lượng Mã nguồn

```bash
# Kiểm thử Backend Spring Boot
cd backend/ailms
./mvnw test

# Kiểm thử AI Service Pytest
cd ai-service
pytest

# Kiểm tra cú pháp và build Frontend
cd frontend/ailms-frontend
npm run lint
npm run build
```

---

## 11. Quy chuẩn Đóng góp (Contributing) & Cam kết Mã nguồn

1. **Fork** repository trên GitHub.
2. Tạo nhánh làm việc: `git checkout -b feature/ten-tinh-nang`.
3. Tuân thủ chuẩn ghi nhận commit **Conventional Commits**:
   - `feat:` Bổ sung tính năng mới.
   - `fix:` Sửa lỗi phát sinh.
   - `refactor:` Tái cấu trúc mã nguồn tối ưu hiệu năng.
   - `config:` Thay đổi cấu hình môi trường / container.
   - `docs:` Cập nhật tài liệu kiến trúc.
   - `test:` Bổ sung kiểm thử tự động.
4. Đảm bảo toàn bộ test case đều pass trước khi tạo **Pull Request**.

---

## 12. Giấy phép (License)

Dự án được phân phối dưới giấy phép mã nguồn mở **MIT License**. Xem chi tiết tại tệp [LICENSE](LICENSE).

<div align="center">
  <sub>Được thiết kế và phát triển với các tiêu chuẩn công nghệ cao bởi <b>Vũ Tiến Đạt</b> và cộng sự.</sub>
</div>
