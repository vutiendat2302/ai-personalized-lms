## 1. Tổng quan Tech Stack

- **Framework:** Spring Boot 4.x + Spring Security 6.x
- **Xác thực:** JWT (Access Token + Refresh Token)
- **Mã hóa mật khẩu:** BCrypt (`PasswordEncoder`)
- **Lưu trữ OTP / Reset Token:** Redis (TTL tự động, không cần cron dọn dẹp)
- **Gửi email:** Spring Mail (`JavaMailSender`)
- **Phân quyền:** RBAC (Role-Based Access Control) 2 tầng — Role (`ROLE_XXX`) + Permission chi tiết (`entity_action`)
- **Lưu trữ File:** MinIo/S3 
- **Id** Snowflake, ngoài ra có sử dụng thêm UUID trong việc tạo mã code, ... 

### 1.1 Quy ước viết Controller & Service

| Tầng | Nhiệm vụ |
|---|---|
| **Controller** | Nhận request, gọi Service, bọc kết quả vào `ApiResponse<T>`. Không chứa logic nghiệp vụ, không try/catch. |
| **Service** | Xử lý toàn bộ logic nghiệp vụ. Gặp lỗi thì ném exception. |
| **GlobalExceptionHandler** | Bắt mọi exception, map sang đúng HTTP status, trả `ErrorResponse` thống nhất. |
 
---

### 1.2 Generic Base Layer
- Tách phần CRUD thuần và find-sort-page thành lớp base generic, entity nào không có business logic đặc biệt thì kế thừa và dùng thẳng. Entity có rule riêng (enroll, publish, permission check...) thì override hoặc viết method riêng ngoài base.


- Audit log qua Event, không gọi trực tiếp, `@EventListener` riêng ghi `audit_log` — tách khỏi business logic chính.

- Patterns: 
1. Facade: Cung cấp một giao diện đơn giản và thống nhất để truy cập một hệ thống phức tạp gồm nhiều lớp hoặc service bên trong.
2. Strategy: Định nghĩa nhiều thuật toán có thể thay thế cho nhau
3. Factory: Đóng gói việc khởi tạo đối tượng
4. State: Cho phép đối tượng thay đổi hành vi dựa trên trạng thái hiện tại, đồng thời kiểm soát các quy tắc chuyển đổi giữa các trạng thái.
5. Decorator: Bổ sung chức năng cho đối tượng một cách linh hoạt mà không cần sửa đổi mã nguồn gốc
6. Observer: 1 hành động xảy ra cần kích hoạt nhiều việc khác, nhưng các việc đó không nên phụ thuộc cứng vào nhau. 

--- 

## 2. Module Security

### 2.1. Các thành phần bảo mật chính

- Spring Security: quản lý xác thực và phân quyền.
- JWT: xác thực request giữa client và server.
- BCrypt: mã hóa mật khẩu trước khi lưu vào database.
- Role/Permission: kiểm soát quyền truy cập theo vai trò.
- Redis: dùng để vô hiệu hóa token khi đổi mật khẩu hoặc reset mật khẩu.
- OTP qua email: bảo vệ quy trình đăng ký và khôi phục mật khẩu.

--- 
- Đăng nhập: user sẽ được cấp 2 loại token là AccessToken (thời gian ngắn) và RefreshToken (thời gian dài). Khi hết thời gian của AccessToken, hệ thống sẽ kiểm tra RefreshToken và cấp lại AccessToken và RefreshToken mới.

- Access Token lưu trong state/memory phía FE, Refresh Token lưu trong cookie `httpOnly Cookie`

--- 

- Xác thực request (JWT Filter)

- Mỗi request có kèm Access Token sẽ đi qua `JwtAuthFilter` trước khi tới Controller:

---
### 2.2. Quá trình đăng nhập
1. Client gửi yêu cầu đăng nhập đến endpoint `/api/auth/login`.
2. AuthController nhận request và chuyển cho AuthService xử lý.
3. AuthService sử dụng `AuthenticationManager` để xác thực username/email và mật khẩu.
4. Spring Security gọi `CustomUserDetailsService` để tải thông tin người dùng từ cơ sở dữ liệu.
5. Hệ thống kiểm tra role và permission của người dùng.
6. Nếu xác thực thành công, server tạo:
   - Access Token để gọi các API bảo vệ
   - Refresh Token để cấp lại access token mới
7. Server trả về token cho client.

### 2.3. Quá trình truy cập API bảo vệ
1. Client gửi request kèm Bearer Token trong header `Authorization`.
2. Request đi qua `JwtAuthFilter` trước khi đến controller.
3. `JwtAuthFilter` đọc token, kiểm tra tính hợp lệ và thời gian hết hạn.
4. Nếu token hợp lệ, hệ thống lấy thông tin người dùng từ JWT.
5. Hệ thống tải role và permission từ cơ sở dữ liệu.
6. Authentication được đặt vào `SecurityContext`.
7. Spring Security thực hiện kiểm tra phân quyền trước khi cho phép request tiếp tục.

### 2.4. Sơ đồ Sequence


```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant AuthenticationManager
    participant CustomUserDetailsService
    participant Database
    participant JwtUtils
    participant JwtAuthFilter
    participant Controller

    Client->>AuthController: POST /api/auth/login
    AuthController->>AuthService: login(request)
    AuthService->>AuthenticationManager: authenticate(username, password)
    AuthenticationManager->>CustomUserDetailsService: loadUserByUsername()
    CustomUserDetailsService->>Database: truy vấn user, role, permission
    Database-->>CustomUserDetailsService: thông tin người dùng
    CustomUserDetailsService-->>AuthenticationManager: UserDetails
    AuthenticationManager-->>AuthService: xác thực thành công
    AuthService->>JwtUtils: tạo Access Token + Refresh Token
    JwtUtils-->>AuthService: JWT
    AuthService-->>AuthController: trả về token
    AuthController-->>Client: trả về access token và refresh token

    Client->>Controller: gọi API bảo vệ với Bearer Token
    Controller->>JwtAuthFilter: intercept request
    JwtAuthFilter->>JwtUtils: validate token
    JwtUtils-->>JwtAuthFilter: token hợp lệ / không hợp lệ
    JwtAuthFilter->>CustomUserDetailsService: load authorities
    CustomUserDetailsService->>Database: truy vấn role và permission
    Database-->>CustomUserDetailsService: authorities
    JwtAuthFilter-->>Controller: thiết lập Authentication
    Controller-->>Client: trả về dữ liệu
```


### 2.5. Flowchart

```mermaid
flowchart TD
    A[Client gửi request] --> B{Endpoint công khai?}
    B -->|Có| C[Cho phép truy cập]
    B -->|Không| D[JwtAuthFilter kiểm tra JWT]
    D --> E{Token hợp lệ?}
    E -->|Không| F[Trả về 401/403]
    E -->|Có| G[Load thông tin user và quyền]
    G --> H[Thiết lập SecurityContext]
    H --> I[Kiểm tra role/permission]
    I --> J[Cho phép thực thi request]
```

--- 

### 2.6. Đăng ký tài khoản (Student)
 
```mermaid
flowchart TD
    A["Nhập form đăng ký"] --> B["Validate<br/><small>email/username chưa tồn tại, password đủ mạnh</small>"]
    B --> C["Hash password (BCrypt)"]
    C --> D["INSERT user<br/><small>status = PENDING_VERIFICATION</small>"]
    D --> E["INSERT user_role<br/><small>gán role STUDENT</small>"]
    E --> F["INSERT student_profile"]
    F --> G["Sinh OTP 6 số → Redis<br/><small>key: otp:register:{email}, TTL 5p</small>"]
    G --> H["Gửi email chứa OTP"]
    H --> I["Response: Đăng ký thành công,<br/>vui lòng xác thực email"]
```
 
### 2.7. Xác thực OTP
 
```mermaid
flowchart TD
    A["User nhập OTP"] --> B{"OtpService.verifyOtp()<br/>còn hạn & đúng?"}
    B -->|"Sai/hết hạn"| C["Trả lỗi<br/>FE hiện nút Gửi lại OTP"]
    B -->|"Hợp lệ"| D["UPDATE user<br/>status = ACTIVE"]
    D --> E["Xóa OTP khỏi Redis"]
    E --> F["Ghi audit_log: VERIFY_EMAIL"]
    F --> G["Response: Xác thực thành công"]
```
 
### 2.8. Đăng nhập
 
```mermaid
flowchart TD
    A["Nhập username/email + password"] --> B["AuthenticationManager.authenticate()"]
    B --> C["DaoAuthenticationProvider"]
    C --> D["CustomUserDetailsService.loadUserByUsername()<br/><small>query user + roles + permissions (tránh N+1)</small>"]
    D --> E["PasswordEncoder.matches()"]
    E -->|"Sai"| F["BadCredentialsException"]
    E -->|"Đúng"| G{"status = ACTIVE?"}
    G -->|"LOCKED/PENDING"| H["DisabledException/LockedException<br/>nêu lý do cụ thể"]
    G -->|"ACTIVE"| I["JwtUtils: sinh Access Token + Refresh Token"]
    I --> J["Response: accessToken, refreshToken,<br/>roles, permissions"]
    J --> K["FE load dashboard theo role"]
```
 
### 2.9. Đăng xuất
 
```mermaid
flowchart TD
    A["User bấm Logout"] --> B["Thêm accessToken vào blacklist Redis<br/><small>TTL = thời gian còn lại của token</small>"]
    B --> C["Xóa refreshToken tương ứng"]
    C --> D["Ghi audit_log: LOGOUT"]
    D --> E["FE: clear token, redirect /login"]
```
> JWT stateless nên không "xóa" token được — dùng **blacklist Redis**, `JwtAuthFilter` check thêm token có trong blacklist trước khi cho qua.
 
### 2.10. Quên mật khẩu
 
```mermaid
flowchart TD
    A["Nhập email/SĐT"] --> B{"Tìm user"}
    B -->|"Không thấy"| C["Trả thông báo CHUNG<br/><small>tránh lộ email có tồn tại hay không</small>"]
    B -->|"Thấy"| D["Sinh reset_token (UUID) → Redis<br/><small>TTL 5p, key: user_id</small>"]
    D --> E["Gửi email chứa link reset"]
    E --> F["User bấm link, nhập password mới"]
    F --> G{"validateToken()<br/>còn hạn & đúng user?"}
    G -->|"Sai/hết hạn"| H["Trả lỗi"]
    G -->|"Hợp lệ"| I["Hash & UPDATE password mới"]
    I --> J["Xóa reset_token khỏi Redis"]
    J --> K["Ghi audit_log: RESET_PASSWORD"]
    K --> L["Vô hiệu hóa TOÀN BỘ token cũ<br/><small>buộc login lại mọi thiết bị</small>"]
```
 
### 2.11. Đổi mật khẩu (đã đăng nhập)
 
```mermaid
flowchart TD
    A["Nhập oldPassword, newPassword, confirmPassword"] --> B["Validate: khớp confirm, đủ mạnh"]
    B --> C{"oldPassword khớp DB?"}
    C -->|"Sai"| D["Trả lỗi"]
    C -->|"Đúng"| E["Hash & UPDATE newPassword"]
    E --> F["Ghi audit_log: CHANGE_PASSWORD"]
    F --> G["Vô hiệu hóa token cũ<br/><small>(trừ session hiện tại, tùy policy)</small>"]
```
 
### 2.12. Xem / Cập nhật thông tin cá nhân
 
```mermaid
flowchart TD
    A["GET /api/users/me"] --> B["JwtAuthFilter xác thực token"]
    B --> C["Trả username, email, fullName,<br/>avatar, roles..."]
 
    D["Sửa full_name/phone/avatar"] --> E{"Có đổi email?"}
    E -->|"Không"| F["UPDATE user bình thường"]
    E -->|"Có"| G["Lưu pending_email<br/>Gửi OTP tới email MỚI<br/><small>giữ email cũ cho tới khi xác thực xong</small>"]
    G --> H["User xác thực OTP"]
    H --> I["Ghi đè email chính thức"]
```

### 2.13. Invite User qua Email

### Flow

```mermaid
flowchart TD
    A[Admin click Invite User] --> B[Nhập email + optional role]
    B --> C{Email đã tồn tại?}
    C -->|Có| D[Báo lỗi: email đã tồn tại]
    C -->|Không| E[Tạo user status=pending]
    E --> F[Sinh invite token có expire]
    F --> G[Gán role nếu có chọn sẵn]
    G --> H[Gửi email chứa link invite]
    H --> I[User click link trong email]
    I --> J{Token còn hạn?}
    J -->|Hết hạn| K[Hiện thông báo hết hạn + nút Resend]
    K --> L[Admin resend invite -> sinh token mới]
    L --> H
    J -->|Còn hạn| M[Hiện form set password]
    M --> N[User nhập password]
    N --> O[BE set password_hash, status=active]
    O --> P[Ghi audit_log: user_activated]
    P --> Q[Redirect user tới trang login/dashboard]
```
---

## 3. Module User-Role-Permission (RBAC)

### 3.1. Assign / Remove Role cho User

```mermaid
flowchart TD
    A[Vào User Detail - tab Roles] --> B[Hiển thị role hiện tại]
    B --> C{Thao tác?}
    C -->|Add| D[Chọn role từ dropdown loại trừ role đã có]
    D --> E[Optional: set expired_at]
    E --> F[Submit]
    F --> G[Insert user_role]
    G --> H[Ghi audit_log]
    H --> I[Cập nhật UI - thêm chip role]

    C -->|Remove| J[Click x trên chip role]
    J --> K{Đây là role cuối cùng của user?}
    K -->|Có và hệ thống bắt buộc >=1 role| L[Chặn, báo lỗi]
    K -->|Không| M[Modal confirm]
    M --> N[Xóa record user_role]
    N --> O[Ghi audit_log]
    O --> P[Cập nhật UI - remove chip]
```


### 3.2. Bulk Action (Xóa / Gán Role hàng loạt)


```mermaid
flowchart TD
    A[Chọn checkbox nhiều user] --> B[Action bar hiện: Delete / Assign Role / Deactivate]
    B --> C{Chọn action nào?}

    C -->|Delete| D[Modal confirm liệt kê số lượng]
    D --> E[Confirm]
    E --> F[BE loop qua từng user_id]
    F --> G{User có thể xóa?}
    G -->|Được| H[Update status=deleted]
    G -->|Bị chặn - VD đang owner course| I[Skip, ghi nhận lỗi]
    H --> J[Ghi audit_log]
    I --> K[Tổng hợp kết quả]
    J --> K
    K --> L[Trả về: Thành công X/Y, chi tiết user lỗi]

    C -->|Assign Role| M[Chọn role từ dropdown]
    M --> N[Confirm]
    N --> O[BE loop: insert user_role nếu chưa có]
    O --> P[Skip nếu user đã có role đó]
    P --> Q[Ghi audit_log]
    Q --> R[Trả về kết quả tổng hợp]
```

### 3.3. Clone Role

```mermaid
flowchart TD
    A[Vào Role Detail hoặc Role List] --> B[Click Clone]
    B --> C[Modal nhập code/name role mới]
    C --> D[Validate code unique]
    D -->|Trùng| E[Báo lỗi]
    D -->|Hợp lệ| F[Submit]
    F --> G[BE tạo role mới]
    G --> H[Query toàn bộ role_permission của role gốc]
    H --> I[Insert record role_permission mới - copy permission_id, đổi role_id]
    I --> J[Ghi audit_log: role_cloned]
    J --> K[Redirect sang trang Edit role mới]
```

### 3.4. Xóa Role / Permission có ràng buộc


```mermaid
flowchart TD
    A[Click Delete Role] --> B{is_system = true?}
    B -->|Có| C[Chặn hoàn toàn, ẩn nút Delete]
    B -->|Không| D[BE check user_role WHERE role_id=X]
    D --> E{Có user nào đang dùng role này?}
    E -->|Có| F[Chặn xóa]
    F --> G[Hiện danh sách user đang dùng]
    G --> H[Admin remove role khỏi từng user trước]
    H --> D
    E -->|Không| I[Cho phép xóa]
    I --> J[Xóa role + cascade role_permission]
    J --> K[Ghi audit_log]
```

### 3.5. Gán nhiều Permission cho Role (Matrix)

```mermaid
flowchart TD
    A[Vào Role Detail - tab Permissions] --> B[Render matrix group theo entity]
    B --> C[Pre-check các permission đã có trong role_permission]
    C --> D[Admin tick/untick checkbox]
    D --> E[Click Save]
    E --> F[FE tính diff: permission thêm mới vs bỏ tick]
    F --> G[BE nhận danh sách permission_ids mới]
    G --> H[So sánh với DB hiện tại]
    H --> I[Insert permission mới được thêm]
    H --> J[Delete permission bị bỏ tick]
    I --> K[Ghi audit_log]
    J --> K
    K --> L[Toast thành công]
```

### 3.6. Effective Permissions (Tổng hợp quyền của 1 User)


```mermaid
flowchart TD
    A[Vào User Detail - tab Permissions] --> B[BE query user_role WHERE user_id=X]
    B --> C[Lọc role còn hiệu lực - expired_at NULL hoặc > now]
    C --> D[Query role_permission JOIN permission cho các role đó]
    D --> E[Dedupe permission - 1 permission có thể đến từ nhiều role]
    E --> F[Giữ lại mapping: permission -> danh sách role nguồn]
    F --> G[Group permission theo entity]
    G --> H[Render UI read-only]
    H --> I[Mỗi permission hiện badge: đến từ role nào]
```


### 3.7. ERD mô hình bảo mật

```mermaid
erDiagram
    USER ||--o{ USER_ROLE : has
    ROLE ||--o{ USER_ROLE : assigned_to
    ROLE ||--o{ ROLE_PERMISSION : contains
    PERMISSION ||--o{ ROLE_PERMISSION : assigned_to
    USER ||--o{ AUDIT_LOG : performs

    USER {
        bigint id PK
        string username
        string email
        string password_hash
        string full_name
        enum status
    }

    ROLE {
        bigint id PK
        string name
        string code
        boolean is_system_role
    }

    PERMISSION {
        bigint id PK
        string entity
        string action
    }

    USER_ROLE {
        bigint id PK
        bigint user_id FK
        bigint role_id FK
        datetime assigned_at
    }

    ROLE_PERMISSION {
        bigint id PK
        bigint role_id FK
        bigint permission_id FK
        datetime assigned_at
    }

    AUDIT_LOG {
        bigint id PK
        bigint user_id FK
        string action
        string object_type
        datetime created_at
    }
```

## 4. Moduel File Management (Storage + Metadata)


### 4.1 Kiến trúc 3 tầng

```mermaid
flowchart LR
    Client["Module nghiệp vụ khác<br/><small>(Contract, Avatar, Document...)</small>"]
    IFS["IFileService<br/><small>Tầng điều phối (facade)</small>"]
    Storage["IFileStorageService<br/><small>MinIO</small>"]
    Meta["IFileMetadataService<br/><small>MySQL</small>"]
    MinIO[("MinIO / S3")]
    DB[("MySQL<br/>file_metadata")]

    Client --> IFS
    IFS --> Storage
    IFS --> Meta
    Storage --> MinIO
    Meta --> DB
```

---

### 4.2. Luồng Upload File

```mermaid
flowchart TD
    A["Module nghiệp vụ gọi<br/>fileService.uploadFile(file, fileType)"]
    B{"File hợp lệ?<br/><small>(không null/rỗng)</small>"}
    C["Sinh fileKey<br/><small>{fileType}/{yyyy/MM}/{uuid}.{ext}</small>"]
    D["fileStorageService.upload()<br/><small>Đẩy file lên MinIO</small>"]
    E{"Upload MinIO<br/>thành công?"}
    F["fileMetadataService.create()<br/><small>Lưu record vào MySQL, status = ACTIVE</small>"]
    G{"Lưu DB<br/>thành công?"}
    H["Trả về FileMetadataResponse<br/><small>gồm fileKey, originalName, fileSize...</small>"]
    X1["Throw BusinessException<br/><small>'File không được để trống'</small>"]
    X2["Throw FileStorageException<br/><small>Rollback: không tạo metadata</small>"]
    X3["File trên MinIO<br/><small>Không có metadata trỏ tới<br/>→ job quét dọn định kỳ</small>"]

    A --> B
    B -->|Không| X1
    B -->|Có| C
    C --> D
    D --> E
    E -->|Thất bại| X2
    E -->|Thành công| F
    F --> G
    G -->|Thành công| H
    G -->|Thất bại| X3
```


- Upload MinIO **trước**, ghi metadata DB **sau** — nếu DB fail, báo lỗi và rolback. 
- `fileKey` luôn do `IFileService` gen. 

---

### 4.3. Luồng Download / Lấy URL File

```mermaid
flowchart TD
    A["Client gọi<br/>fileService.getDownloadUrl(fileKey)"]
    B["fileMetadataService.getByFileKey()<br/><small>Truy vấn MySQL</small>"]
    C{"Metadata<br/>tồn tại?"}
    D{"status<br/>= ACTIVE?"}
    E["fileStorageService.getPresignedUrl()<br/><small>Sinh URL có thời hạn</small>"]
    F["Trả presigned URL<br/>cho client"]
    X1["Throw ResourceNotFoundException<br/><small>Không tìm thấy file</small>"]
    X2["Throw BusinessException<br/><small>File không khả dụng hoặc đã bị xóa</small>"]

    A --> B
    B --> C
    C -->|Không| X1
    C -->|Có| D
    D -->|Không| X2
    D -->|Có| E
    E --> F
```

- Client (FE) tải file **trực tiếp từ MinIO** qua presigned URL, không proxy qua backend.
- Luôn check `status = ACTIVE` trước khi sinh URL, không cấp quyền truy cập file đã bị soft-delete.

---

### 4.4. Luồng Xóa Hard File và Soft File 

- Hard File 

```mermaid
flowchart TD
    A["Client gọi<br/>fileService.deleteHardFile(fileKey)"]
    B["fileStorageService.delete()<br/><small>Xóa file vật lý khỏi MinIO</small>"]
    C{"Xóa MinIO<br/>thành công?"}
    D["fileMetadataService.hardDelete()<br/><small>Xóa record khỏi MySQL</small>"]
    E["Hoàn tất xóa"]
    X1["Throw FileStorageException<br/><small>Dừng lại — KHÔNG xóa metadata</small>"]

    A --> B
    B --> C
    C -->|Thất bại| X1
    C -->|Thành công| D
    D --> E
```
--- 

- Soft File 

```mermaid
flowchart TD
    A["Client gọi<br/>fileService.deleteSoftFile(fileKey)"]
    B["fileMetadataService.softDelete()<br/><small>Cập nhật status -> Inactive</small>"]
    C{"Xóa thành công?"}
    D["Hoàn tất xóa"]
    X1["Throw FileStorageException<br/><small>Dừng lại</small>"]


    A --> B
    B --> C
    C -->|Thất bại| X1
    C -->|Thành công| D
```

---

### 4.5. Luồng Tìm kiếm / Phân trang File (Admin)

```mermaid
flowchart TD
    A["Admin gọi<br/>GET /admin/files?keyword=&fileTypes=&statuses=&page=&size=&sort="]
    B["Controller bind query param<br/>→ FileSearchRequest"]
    C["fileMetadataService.search(request)"]
    D["Build Specification động"]
    D1["keyword → LIKE originalName/fileKey"]
    D2["fileTypes → IN filter"]
    D3["statuses → IN filter<br/><small>(mặc định loại DELETED nếu không truyền)</small>"]
    D4["createdFrom/createdTo → range filter"]
    E["Apply Pageable<br/><small>(page, size, sort)</small>"]
    F["Query MySQL qua Specification"]
    G["Map Page<Entity> → Page<FileMetadataResponse>"]
    H["Trả về danh sách + thông tin phân trang<br/>cho FE hiển thị bảng quản lý file"]

    A --> B --> C --> D
    D --> D1 --> E
    D --> D2 --> E
    D --> D3 --> E
    D --> D4 --> E
    E --> F --> G --> H
```
--- 
## 5. Module HR Management
