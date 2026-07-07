## 1. Tổng quan Tech Stack

- **Framework:** Spring Boot 4.x + Spring Security 6.x
- **Xác thực:** JWT (Access Token + Refresh Token)
- **Mã hóa mật khẩu:** BCrypt (`PasswordEncoder`)
- **Lưu trữ OTP / Reset Token:** Redis (TTL tự động, không cần cron dọn dẹp)
- **Gửi email:** Spring Mail (`JavaMailSender`)
- **Phân quyền:** RBAC (Role-Based Access Control) 2 tầng — Role (`ROLE_XXX`) + Permission chi tiết (`entity_action`)

---

## 2. Nơi lưu Access Token phía Client

Có 3 cách phổ biến để Frontend lưu Access Token, mỗi cách có đánh đổi riêng:

| Cách lưu | Ưu điểm | Nhược điểm | Khuyến nghị |
|---|---|---|---|
| **Session (memory/state JS)** | An toàn nhất trước XSS (mất khi refresh trang, không đọc được từ script khác) | Mất token khi F5 trang, cần gọi lại `/refresh` mỗi lần load | ✅ Dùng cho **Access Token** |
| **httpOnly Cookie** | JS không đọc được → chống XSS tốt | Cần xử lý CORS + CSRF, gửi kèm mọi request cùng domain | ✅ Dùng cho **Refresh Token** |
| **localStorage** | Dễ implement, giữ token qua F5 | JS đọc được → dễ bị đánh cắp qua XSS | ❌ Không khuyến nghị cho token nhạy cảm |

**Kết luận áp dụng cho dự án:** Access Token lưu trong state/memory phía FE (mất khi F5, tự refresh lại), Refresh Token lưu trong cookie `httpOnly + Secure + SameSite=Strict`.

---

## 3. Luồng xác thực request (JWT Filter)

Mỗi request có kèm Access Token sẽ đi qua `JwtAuthFilter` trước khi tới Controller:

```
Client
  │
  │  Header: Authorization: Bearer eyJhbGc...
  ▼
JwtAuthFilter
  │
  ├─ 1. parseJwt()                    → tách chuỗi token ra khỏi header "Bearer "
  ├─ 2. validateJwtToken()            → verify chữ ký + kiểm tra hạn (exp claim)
  ├─ 3. getUserNameFromJwtToken()     → decode payload lấy username/email
  ├─ 4. loadUserByUsername()          → CustomUserDetailsService load lại user + roles/permissions từ DB
  ├─ 5. tạo Authentication object     → new UsernamePasswordAuthenticationToken(userDetails, null, authorities)
  ├─ 6. SecurityContextHolder.setAuthentication()  → gắn vào context của request hiện tại
  ▼
Controller (đã có thông tin user đã xác thực, có thể check @PreAuthorize)
```

> Lưu ý: bước 5 dùng constructor 3 tham số (có `authorities`) vì token đã được xác thực bằng chữ ký JWT ở bước 2, không cần verify lại password.

---

## 4. Luồng Đăng ký / Đăng nhập (Service Layer)

```
Client
  │
  ▼
AuthController
  │
  ▼
AuthServiceImpl (implements IAuthService)
  │
  ├── Đăng ký
  │      ▼
  │   UserRepository.save()  →  status = PENDING_VERIFICATION
  │      ▼
  │   OtpService.generateAndStoreOtp()  →  lưu Redis, TTL 5 phút
  │      ▼
  │   EmailService.sendOtpEmail()
  │
  └── Đăng nhập
         ▼
  AuthenticationManager.authenticate()
         ▼
  JwtUtils.generateJwtToken() / generateRefreshToken()
         ▼
  JwtAuthenticationResponse (accessToken, refreshToken, roles, permissions...)
```

### Chi tiết bước xác thực password khi login:

```
Username/Email + Password
        │
        ▼
AuthenticationManager
        │
        ▼
DaoAuthenticationProvider
        │
        ▼
CustomUserDetailsService.loadUserByUsername()
        │
        ▼
UserRepository (query user + roles + permissions — đã tối ưu tránh N+1)
        │
        ▼
PasswordEncoder.matches(rawPassword, hashedPassword)
        │
        ▼
So sánh mật khẩu → khớp → tạo Authentication (authenticated = true)
                 → không khớp → BadCredentialsException
```

---

## 5. Chi tiết từng chức năng (Sequence Flow)

### 5.1. Đăng ký tài khoản (Student)

| Bước | Hành động | Thành phần xử lý |
|---|---|---|
| 1 | Student nhập thông tin đăng ký (username, email, password, họ tên...) | Frontend |
| 2 | Validate dữ liệu đầu vào (định dạng email, độ mạnh password, username/email trùng chưa) | `RegisterRequest` (Bean Validation) + `AuthServiceImpl` |
| 3 | Hash password bằng BCrypt | `PasswordEncoder.encode()` |
| 4 | Insert vào bảng `user`: `status = PENDING_VERIFICATION`, `created_by = null` | `UserRepository` |
| 5 | Insert vào bảng `user_role`: tự động gán role `STUDENT` | `UserRoleRepository` |
| 6 | Insert vào bảng `student_profile` (thông tin riêng của student) | `StudentProfileRepository` |
| 7 | Sinh mã OTP (6 số), lưu Redis với key `otp:register:{email}`, TTL 5 phút | `OtpService.generateAndStoreOtp()` |
| 8 | Gửi email chứa OTP tới email vừa đăng ký | `EmailService.sendOtpEmail()` |
| 9 | Trả về response: *"Đăng ký thành công, vui lòng xác thực email"* | `AuthController` |

```
Student → [Nhập form đăng ký] → AuthController
                                      │
                                      ▼
                              AuthServiceImpl.register()
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            UserRepository    UserRoleRepository  StudentProfileRepository
            (status=PENDING)   (gán role STUDENT)   (tạo profile rỗng)
                    │
                    ▼
            OtpService.generateAndStoreOtp()  →  Redis (TTL 5p)
                    │
                    ▼
            EmailService.sendOtpEmail()  →  Gửi OTP tới email
                    │
                    ▼
            Response: "Đăng ký thành công, vui lòng xác thực email"
```

---

### 5.2. Xác thực email (Verify OTP)

| Bước | Hành động | Thành phần xử lý |
|---|---|---|
| 1 | User nhập mã OTP nhận được qua email | Frontend |
| 2 | BE tìm OTP theo key `otp:register:{email}` trong Redis | `OtpService.verifyOtp()` |
| 3 | Nếu **không tồn tại / hết hạn** → trả lỗi, cho phép người dùng bấm "Gửi lại OTP" | `AuthServiceImpl.resendOtp()` |
| 4 | Nếu **hợp lệ** → update `user.status = ACTIVE` | `UserRepository` |
| 5 | Xóa OTP khỏi Redis (tránh dùng lại) | `OtpService.invalidateOtp()` |
| 6 | Insert `audit_log` (hành động: `VERIFY_EMAIL`, `user_id`, thời gian) | `AuditLogService` |
| 7 | Cho phép user login vào hệ thống | — |

```
User nhập OTP → AuthController.verifyOtp()
                        │
                        ▼
                AuthServiceImpl.verifyRegistrationOtp()
                        │
                        ▼
                OtpService.verifyOtp(email, otp)
                   │             │
            [hết hạn/sai]   [hợp lệ]
                   │             │
                   ▼             ▼
        trả lỗi,          UserRepository.save()
        FE hiện nút        (status = ACTIVE)
        "Gửi lại OTP"           │
                                ▼
                        OtpService.invalidateOtp()
                                │
                                ▼
                        AuditLogService.log("VERIFY_EMAIL")
                                │
                                ▼
                        Response: "Xác thực thành công"
```

---

### 5.3. Đăng nhập

| Bước | Hành động | Thành phần xử lý |
|---|---|---|
| 1 | User nhập username/email + password | Frontend |
| 2 | BE xác thực thông tin qua `AuthenticationManager` (xem sơ đồ mục 4) | `AuthenticationManager` → `DaoAuthenticationProvider` |
| 3 | Nếu sai thông tin → trả lỗi cụ thể (sai mật khẩu / không tồn tại) | `BadCredentialsException` |
| 4 | Nếu đúng thông tin → check `status` tài khoản (`ACTIVE`, `PENDING_VERIFICATION`, `LOCKED`) | `CustomUserDetails.isEnabled()`, `isAccountNonLocked()` |
| 5 | Nếu `status != ACTIVE` → từ chối login, thông báo lý do cụ thể | `DisabledException` / `LockedException` |
| 6 | Nếu hợp lệ → sinh Access Token + Refresh Token | `JwtUtils` |
| 7 | Trả về response gồm token + roles + permissions | `JwtAuthenticationResponse` |
| 8 | FE nhận `roles` → load dashboard tương ứng (admin/student/teacher...) | Frontend routing |

```
User nhập username/password
        │
        ▼
AuthController.login()
        │
        ▼
AuthServiceImpl.login()
        │
        ▼
AuthenticationManager.authenticate()
        │
   ┌────┴────┐
   ▼         ▼
[Sai TT]   [Đúng TT]
   │         │
   ▼         ▼
Trả lỗi   Check status (ACTIVE? LOCKED? PENDING?)
             │
        ┌────┴────┐
        ▼         ▼
   [Không ACTIVE] [ACTIVE]
        │         │
        ▼         ▼
   Từ chối,   JwtUtils.generateJwtToken()
   nêu lý do  JwtUtils.generateRefreshToken()
                  │
                  ▼
          JwtAuthenticationResponse
          (accessToken, refreshToken, roles, permissions)
                  │
                  ▼
          FE nhận roles → load dashboard theo role
```

---

### 5.4. Đăng xuất

| Bước | Hành động | Thành phần xử lý |
|---|---|---|
| 1 | User gửi request logout kèm Access Token hiện tại | Frontend |
| 2 | BE xác định token, thêm vào **blacklist** (Redis, TTL = thời gian còn lại của token) | `TokenBlacklistService` |
| 3 | Xóa Refresh Token tương ứng khỏi DB/Redis (vô hiệu hóa refresh) | `RefreshTokenRepository` / Redis |
| 4 | Insert `audit_log` (hành động: `LOGOUT`) | `AuditLogService` |
| 5 | FE xóa token khỏi state, chuyển về trang chủ/login | Frontend |

```
User → [Bấm Logout] → AuthController.logout()
                              │
                              ▼
                      AuthServiceImpl.logout()
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
      TokenBlacklistService  RefreshTokenRepo  AuditLogService
      (thêm accessToken      (xóa refreshToken  (log "LOGOUT")
       vào blacklist Redis)   của user)
                              │
                              ▼
                      FE: clear token, redirect → /login
```

> **Lưu ý kỹ thuật:** JWT là stateless nên không thể "xóa" token đã phát hành theo cách thông thường. Cần dùng **blacklist trong Redis** (key = token/jti, value = expiry) — `JwtAuthFilter` sẽ check thêm token có nằm trong blacklist không trước khi cho qua.

---

### 5.5. Quên mật khẩu

| Bước | Hành động | Thành phần xử lý |
|---|---|---|
| 1 | User nhập email/username/SĐT | Frontend |
| 2 | BE tìm user theo thông tin đã nhập | `UserRepository` |
| 3 | Sinh `reset_token` (UUID ngẫu nhiên), lưu Redis kèm `user_id`, TTL 5 phút | `PasswordResetService` |
| 4 | Gửi email chứa link kèm `reset_token` (vd: `https://app.com/reset-password?token=xxx`) | `EmailService` |
| 5 | User bấm link, nhập mật khẩu mới | Frontend |
| 6 | BE xác thực `reset_token` còn hạn và đúng user | `PasswordResetService.validateToken()` |
| 7 | Hash password mới, update vào `user.password_hash` | `PasswordEncoder` + `UserRepository` |
| 8 | Xóa/vô hiệu hóa `reset_token` đã dùng | Redis `delete()` |
| 9 | Insert `audit_log` (hành động: `RESET_PASSWORD`) | `AuditLogService` |
| 10 | **Vô hiệu hóa toàn bộ token cũ (access + refresh) của user này** — bắt buộc login lại trên mọi thiết bị | `TokenBlacklistService` / tăng `token_version` của user |

```
User nhập email/SĐT → AuthController.forgotPassword()
                              │
                              ▼
                      UserRepository.findByEmailOrPhone()
                              │
                        [không tìm thấy] → trả thông báo chung
                        (tránh lộ email nào tồn tại trong hệ thống)
                              │
                        [tìm thấy]
                              ▼
                      Sinh reset_token (UUID) → Redis (TTL 5p, key: user_id)
                              │
                              ▼
                      EmailService gửi link chứa reset_token
                              │
                              ▼
        ... User bấm link, nhập password mới ...
                              │
                              ▼
                AuthController.resetPassword(token, newPassword)
                              │
                              ▼
                PasswordResetService.validateToken()
                   │                     │
             [hết hạn/sai]          [hợp lệ]
                   │                     │
                   ▼                     ▼
             Trả lỗi           PasswordEncoder.encode(newPassword)
                                          │
                                          ▼
                                UserRepository.updatePassword()
                                          │
                                          ▼
                                Xóa reset_token khỏi Redis
                                          │
                                          ▼
                                AuditLogService.log("RESET_PASSWORD")
                                          │
                                          ▼
                          Vô hiệu hóa TOÀN BỘ access/refresh token cũ
                          (blacklist hoặc tăng token_version trong DB)
```

> **Bảo mật quan trọng:** Không nên thông báo "email này chưa đăng ký" ở bước 2 — dễ bị lợi dụng để dò email tồn tại trong hệ thống (user enumeration). Nên trả về thông báo chung: *"Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu"*.

---

### 5.6. Đổi mật khẩu (khi đã đăng nhập)

| Bước | Hành động | Thành phần xử lý |
|---|---|---|
| 1 | User đã login, gửi request đổi mật khẩu: `oldPassword`, `newPassword`, `confirmPassword` | Frontend |
| 2 | BE validate: `newPassword == confirmPassword`, độ mạnh password | `ChangePasswordRequest` (Bean Validation) |
| 3 | Verify `oldPassword` đúng với password hiện tại trong DB | `PasswordEncoder.matches()` |
| 4 | Hash `newPassword`, update `user.password_hash` | `PasswordEncoder.encode()` + `UserRepository` |
| 5 | Insert `audit_log` (hành động: `CHANGE_PASSWORD`) | `AuditLogService` |
| 6 | Vô hiệu hóa các token cũ (trừ session hiện tại, hoặc vô hiệu tất cả tùy policy) | `TokenBlacklistService` |

```
User (đã login) → AuthController.changePassword()
                          │
                          ▼
                  Verify oldPassword khớp DB?
                     │            │
                 [Sai]         [Đúng]
                     │            │
                     ▼            ▼
                Trả lỗi    PasswordEncoder.encode(newPassword)
                                  │
                                  ▼
                          UserRepository.updatePassword()
                                  │
                                  ▼
                          AuditLogService.log("CHANGE_PASSWORD")
                                  │
                                  ▼
                          Vô hiệu hóa token cũ (buộc login lại)
```

---

### 5.7. Xem thông tin cá nhân

```
User (đã login) → GET /api/users/me
                          │
                          ▼
                  JwtAuthFilter xác thực token
                          │
                          ▼
                  UserController.getProfile()
                          │
                          ▼
                  UserService.getCurrentUserProfile(userId từ SecurityContext)
                          │
                          ▼
                  Trả về: username, email, fullName, avatar, roles, ...
```

---

### 5.8. Cập nhật thông tin cá nhân

| Bước | Hành động | Thành phần xử lý |
|---|---|---|
| 1 | User (đã login) sửa `full_name`, `phone`, `avatar` | Frontend |
| 2 | BE validate dữ liệu | `UpdateProfileRequest` |
| 3 | Update bảng `user` | `UserRepository` |
| 4 | **Nếu đổi email:** giữ nguyên `email` cũ, lưu `pending_email` riêng, gửi OTP xác thực tới email mới | `OtpService` + `EmailService` |
| 5 | Chỉ khi xác thực OTP thành công mới ghi đè `email` chính thức | `AuthServiceImpl.verifyEmailChange()` |

```
User sửa thông tin → UserController.updateProfile()
                              │
                              ▼
                      Có đổi email không?
                     │                    │
                  [Không]              [Có]
                     │                    │
                     ▼                    ▼
            Update user bình thường   Lưu pending_email
            (full_name, phone,        Gửi OTP tới email MỚI
             avatar)                  (giữ email CŨ cho tới khi
                                       xác thực xong)
                                              │
                                              ▼
                                    User xác thực OTP email mới
                                              │
                                              ▼
                                    Ghi đè email chính thức
```

---

## 6. Bảng tổng hợp trạng thái tài khoản (`UserStatusEntity`)

| Status | Ý nghĩa | Có login được không? |
|---|---|---|
| `PENDING_VERIFICATION` | Vừa đăng ký, chưa xác thực email | ❌ Không |
| `ACTIVE` | Đã xác thực, hoạt động bình thường | ✅ Có |
| `LOCKED` | Bị khóa (do admin hoặc vi phạm chính sách) | ❌ Không |

---

## 7. Các bảng dữ liệu liên quan (gợi ý)

| Bảng | Vai trò |
|---|---|
| `user` | Thông tin tài khoản gốc |
| `user_role` | Quan hệ many-to-many User ↔ Role |
| `role` | Danh sách role (`ADMIN`, `STUDENT`, `TEACHER`...) |
| `role_permission` | Quan hệ many-to-many Role ↔ Permission |
| `permission` | Danh sách quyền chi tiết (`entity` + `action`, vd: `course_create`) |
| `student_profile` | Thông tin riêng của student (mở rộng ngoài `user`) |
| `audit_log` | Ghi log các hành động nhạy cảm (login, logout, đổi mật khẩu, reset password...) |

---

## 8. Lưu ý bảo mật tổng hợp

- BE là nơi validate quyền cuối cùng — FE chỉ ẩn/hiện UI theo quyền, không thay thế cho check ở BE.
- Access Token TTL ngắn (10–15 phút), Refresh Token dài hơn (7 ngày) nhưng **revoke được** (lưu trong Redis/DB).
- Đổi mật khẩu / reset mật khẩu → luôn vô hiệu hóa token cũ, bắt buộc đăng nhập lại.
- Không tiết lộ thông tin nhạy cảm qua thông báo lỗi (vd: "email không tồn tại" khi quên mật khẩu).
- Mọi hành động nhạy cảm (login, logout, đổi mật khẩu, reset password, khóa tài khoản...) đều ghi `audit_log` để phục vụ điều tra khi có sự cố.