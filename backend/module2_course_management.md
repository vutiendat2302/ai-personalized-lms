# Module 2: Course Management — AI LMS
## Backend Design Documentation

---

## 1. Sequence Diagrams

### 1.1 Tạo khóa học (Create Course)

```mermaid
sequenceDiagram
    actor Admin
    participant API as Course API
    participant Auth as Auth Service
    participant DB as Database
    participant Meta as Metadata Service

    Admin->>API: POST /courses {title, category_id, level}
    API->>Auth: Verify token + role
    Auth-->>API: OK (role: admin/instructor)
    API->>API: Validate input (title, slug unique)
    API->>DB: INSERT INTO courses
    DB-->>API: course_id
    API->>Meta: Init metadata record (course_id)
    Meta->>DB: INSERT INTO course_metadata {lesson_count: 0, total_duration: 0}
    DB-->>Meta: OK
    Meta-->>API: OK
    API-->>Admin: 201 Created {course_id, slug}
```

---

### 1.2 Gán / Hủy gán Giảng viên (Assign / Unassign Instructor)

```mermaid
sequenceDiagram
    actor Admin
    participant API as Course API
    participant Auth as Auth Service
    participant DB as Database
    participant Notif as Notification Service

    Admin->>API: POST /courses/:id/instructors {instructor_id}
    API->>Auth: Verify role = admin
    Auth-->>API: OK
    API->>DB: SELECT * FROM courses WHERE id = :id
    DB-->>API: course record
    API->>DB: SELECT * FROM users WHERE id = instructor_id AND role = 'instructor'
    DB-->>API: instructor record
    API->>DB: INSERT INTO course_instructors (course_id, instructor_id)
    DB-->>API: OK
    API->>Notif: Send email to instructor
    Notif-->>API: queued
    API-->>Admin: 201 {course_id, instructor_id}

    Note over Admin,DB: Hủy gán
    Admin->>API: DELETE /courses/:id/instructors/:instructor_id
    API->>Auth: Verify role = admin
    Auth-->>API: OK
    API->>DB: DELETE FROM course_instructors WHERE ...
    DB-->>API: OK
    API-->>Admin: 204 No Content
```

---

### 1.3 Upload & Attach Lesson Resource

```mermaid
sequenceDiagram
    actor Instructor
    participant API as Resource API
    participant Auth as Auth Service
    participant Storage as File Storage (S3/GCS)
    participant DB as Database

    Instructor->>API: POST /lessons/:id/resources (multipart file)
    API->>Auth: Verify token + course ownership
    Auth-->>API: OK
    API->>API: Validate (mime type, file size ≤ 100MB)

    alt File invalid
        API-->>Instructor: 400 Bad Request
    else File valid
        API->>Storage: Upload file (stream)
        Storage-->>API: file_url, file_key
        API->>DB: INSERT INTO lesson_resources {lesson_id, file_url, file_key, mime, size}
        DB-->>API: resource_id
        API-->>Instructor: 201 {resource_id, file_url}
    end
```

---

### 1.4 Download Lesson Resource (Access Control)

```mermaid
sequenceDiagram
    actor User
    participant API as Resource API
    participant Auth as Auth Service
    participant DB as Database
    participant Storage as File Storage

    User->>API: GET /resources/:id/download
    API->>Auth: Verify token
    Auth-->>API: user_id

    API->>DB: SELECT resource + lesson + course
    DB-->>API: record

    API->>DB: SELECT enrollment WHERE user_id AND course_id
    DB-->>API: enrollment record

    alt Not enrolled
        API-->>User: 403 Forbidden
    else Enrolled
        API->>Storage: Generate signed URL (TTL: 5 min)
        Storage-->>API: signed_url
        API-->>User: 302 Redirect → signed_url
    end
```

---

### 1.5 Lesson Preview (Free / Locked)

```mermaid
sequenceDiagram
    actor Visitor
    participant API as Lesson API
    participant Auth as Auth Service
    participant DB as Database

    Visitor->>API: GET /lessons/:id/preview
    API->>DB: SELECT lesson WHERE id = :id
    DB-->>API: {preview_type: free|locked, content, teaser}

    alt preview_type = free
        API-->>Visitor: 200 {full content}
    else preview_type = locked
        API->>Auth: Check token (optional)
        Auth-->>API: user_id | anonymous

        API->>DB: SELECT enrollment WHERE user_id AND course_id
        DB-->>API: result

        alt Enrolled
            API-->>Visitor: 200 {full content}
        else Not enrolled
            API-->>Visitor: 200 {teaser, locked: true}
        end
    end
```

---

## 2. Data Flow Diagrams (DFD)

### 2.1 DFD Level 0 — Tổng quan hệ thống Course Management

```mermaid
flowchart LR
    Admin([🧑‍💼 Admin])
    Instructor([👨‍🏫 Instructor])
    Student([👩‍🎓 Student])

    System[[Course Management System]]

    Admin -- "CRUD course, category\ngán giảng viên" --> System
    Instructor -- "Tạo section, lesson\nupload resource" --> System
    Student -- "Xem danh sách, preview\ndownload resource" --> System

    System -- "Thông báo gán dạy" --> Instructor
    System -- "Kết quả tìm kiếm\nnội dung bài học" --> Student
    System -- "Báo cáo, danh sách" --> Admin
```

---

### 2.2 DFD Level 1 — Chi tiết luồng dữ liệu

```mermaid
flowchart TD
    Admin([Admin])
    Instructor([Instructor])
    Student([Student])

    P1[1.0\nQuản lý Course]
    P2[2.0\nQuản lý Section & Lesson]
    P3[3.0\nQuản lý Resource]
    P4[4.0\nTính Metadata]
    P5[5.0\nTìm kiếm & Filter]

    DS1[(courses)]
    DS2[(course_sections)]
    DS3[(lessons)]
    DS4[(lesson_resources)]
    DS5[(course_metadata)]
    DS6[(categories)]
    DS7[(course_instructors)]
    DS8[(file_storage)]

    Admin -- course data --> P1
    P1 -- read/write --> DS1
    P1 -- assign --> DS7
    P1 -- category filter --> DS6

    Instructor -- section/lesson data --> P2
    P2 -- read/write --> DS2
    P2 -- read/write --> DS3
    P2 -- trigger --> P4

    Instructor -- file upload --> P3
    P3 -- store file --> DS8
    P3 -- save metadata --> DS4
    P3 -- trigger --> P4

    P4 -- compute --> DS5
    DS5 -- metadata --> P1
    DS5 -- metadata --> P2

    Student -- query params --> P5
    P5 -- search/filter --> DS1
    P5 -- search/filter --> DS6
    P5 -- results --> Student

    DS1 -- course detail --> Student
    DS3 -- lesson content --> Student
    DS4 -- signed URL --> Student
```

---

### 2.3 DFD Level 2 — Luồng Metadata Computation

```mermaid
flowchart LR
    E1([Lesson Event])
    E2([Section Event])
    E3([Course Update])

    P1[Nhận Event]
    P2[Aggregate\nlesson_count\ntotal_duration\nsection_count]
    P3[Fetch avg_rating\nfrom reviews]
    P4[Upsert\ncourse_metadata]
    P5[Invalidate\nCache]

    DS1[(lessons)]
    DS2[(course_sections)]
    DS3[(reviews)]
    DS4[(course_metadata)]
    DS5[(cache layer)]

    E1 --> P1
    E2 --> P1
    E3 --> P1

    P1 --> P2
    DS1 -- COUNT, SUM(duration) --> P2
    DS2 -- COUNT --> P2
    P2 --> P4

    DS3 -- AVG(rating) --> P3
    P3 --> P4

    P4 -- write --> DS4
    P4 --> P5
    P5 -- flush --> DS5
```

---

## 3. Activity Diagrams

### 3.1 Activity: Tạo và Publish khóa học

```mermaid
flowchart TD
    Start([Bắt đầu]) --> A[Admin nhập thông tin\ntitle, slug, description, level]
    A --> B{Validate input}
    B -- Lỗi --> C[Trả về lỗi 400\n+ message]
    C --> A
    B -- Hợp lệ --> D[Kiểm tra slug unique]
    D --> E{Slug đã tồn tại?}
    E -- Có --> F[Auto-generate slug mới\ne.g. react-101-2]
    F --> G[Lưu vào DB\nstatus = draft]
    E -- Không --> G
    G --> H[Gán vào Category]
    H --> I{Gán Instructor?}
    I -- Có --> J[POST /courses/:id/instructors\nGửi notification]
    J --> K[Thêm Section đầu tiên]
    I -- Không --> K
    K --> L[Thêm Lesson vào Section]
    L --> M{Còn lesson nào?}
    M -- Có --> L
    M -- Không --> N{Publish?}
    N -- Draft --> O([Kết thúc — status: draft])
    N -- Publish --> P[PATCH /courses/:id/visibility\nstatus = published]
    P --> Q[Metadata tính toán lại]
    Q --> R([Kết thúc — status: published])
```

---

### 3.2 Activity: Upload Resource & Gắn vào Lesson

```mermaid
flowchart TD
    Start([Bắt đầu]) --> A[Instructor chọn file\nđể upload]
    A --> B{Kiểm tra file}
    B -- Size > 100MB --> C[Báo lỗi: File quá lớn]
    C --> A
    B -- Mime không hợp lệ --> D[Báo lỗi: Định dạng không hỗ trợ]
    D --> A
    B -- OK --> E[Upload lên File Storage\nS3 / GCS]
    E --> F{Upload thành công?}
    F -- Thất bại --> G[Retry tối đa 3 lần]
    G --> H{Hết lượt retry?}
    H -- Có --> I[Trả lỗi 500\nUpload failed]
    H -- Không --> E
    F -- Thành công --> J[Lưu metadata vào DB\nfile_url, file_key, mime, size]
    J --> K{Gắn vào Lesson?}
    K -- Có --> L[INSERT lesson_resources\nlesson_id + resource_id]
    L --> M[Trigger update metadata\ntotal_resources của lesson]
    M --> N([Kết thúc — 201 Created])
    K -- Không --> O([Kết thúc — file lưu standalone])
```

---

### 3.3 Activity: Tìm kiếm & Filter khóa học

```mermaid
flowchart TD
    Start([Người dùng gửi request]) --> A[GET /courses\n?search=&category=&level=&page=]
    A --> B[Parse query params]
    B --> C{Có search keyword?}
    C -- Có --> D[Full-text search\ntrên title + description]
    C -- Không --> E[Lấy toàn bộ courses]
    D --> F[Apply filter]
    E --> F
    F --> G{Có filter category?}
    G -- Có --> H[JOIN categories\nWHERE category_id = ?]
    G -- Không --> I[Skip]
    H --> J[Apply filter level]
    I --> J
    J --> K{Có filter level?}
    K -- Có --> L[WHERE level = beginner/intermediate/advanced]
    K -- Không --> M[Skip]
    L --> N[Apply status filter]
    M --> N
    N --> O[WHERE status = published]
    O --> P[Paginate\nLIMIT + OFFSET]
    P --> Q[Attach metadata\nlesson_count, avg_rating, duration]
    Q --> R[Trả về 200\n{data: [], pagination: {}}]
    R --> End([Kết thúc])
```

---

### 3.4 Activity: Lesson Preview Flow (Free vs Locked)

```mermaid
flowchart TD
    Start([User truy cập lesson]) --> A[GET /lessons/:id/preview]
    A --> B[Fetch lesson record]
    B --> C{preview_type?}

    C -- free --> D[Trả full content\n200 OK]
    D --> End1([Kết thúc])

    C -- locked --> E{User đã đăng nhập?}
    E -- Không --> F[Trả teaser content\n+ locked: true\n+ CTA enroll]
    F --> End2([Kết thúc])

    E -- Có --> G[Kiểm tra enrollment\nSELECT FROM enrollments]
    G --> H{Đã enroll?}
    H -- Có --> I[Trả full content\n200 OK]
    H -- Không --> J[Trả teaser content\n+ locked: true\n+ link thanh toán]
    I --> End3([Kết thúc])
    J --> End4([Kết thúc])
```

---

## 4. Tổng hợp API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/courses` | Tạo khóa học |
| `GET` | `/courses` | Danh sách + filter + search |
| `GET` | `/courses/:id` | Chi tiết + metadata |
| `PUT` | `/courses/:id` | Cập nhật |
| `PATCH` | `/courses/:id/visibility` | Ẩn / hiện / draft |
| `DELETE` | `/courses/:id` | Xóa mềm |
| `POST` | `/courses/:id/instructors` | Gán giảng viên |
| `DELETE` | `/courses/:id/instructors/:iid` | Hủy gán |
| `GET` | `/courses/:id/instructors` | Danh sách giảng viên |
| `POST` | `/courses/:id/sections` | Tạo section |
| `GET` | `/courses/:id/sections` | Danh sách section |
| `PUT` | `/sections/:id` | Cập nhật section |
| `DELETE` | `/sections/:id` | Xóa section |
| `PATCH` | `/sections/reorder` | Sắp xếp thứ tự |
| `POST` | `/categories` | Tạo category |
| `GET` | `/categories` | Danh sách |
| `PUT` | `/categories/:id` | Cập nhật |
| `DELETE` | `/categories/:id` | Xóa |
| `GET` | `/categories/:id/courses` | Filter course theo category |
| `POST` | `/sections/:id/lessons` | Tạo bài học |
| `GET` | `/sections/:id/lessons` | Danh sách bài học |
| `GET` | `/lessons/:id` | Chi tiết bài học |
| `PUT` | `/lessons/:id` | Cập nhật |
| `DELETE` | `/lessons/:id` | Xóa |
| `GET` | `/lessons/:id/preview` | Preview free/locked |
| `POST` | `/lessons/:id/resources` | Upload & gắn file |
| `GET` | `/lessons/:id/resources` | Danh sách file |
| `DELETE` | `/resources/:id` | Xóa file |
| `GET` | `/resources/:id/download` | Download (signed URL) |
