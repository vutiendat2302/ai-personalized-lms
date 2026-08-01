# Đặc tả: Ký điện tử hợp đồng (nội bộ, không qua eContract Provider)

## 1. Bối cảnh & phạm vi

Đây là quy trình **ký điện tử đơn giản (simple e-signature)** thực hiện nội bộ trong hệ thống, không tích hợp Nhà cung cấp eContract được cấp phép, không kết nối Nền tảng hợp đồng lao động điện tử quốc gia (theo Nghị định 337/2025/NĐ-CP).

Cơ sở pháp lý áp dụng: khoản 1 Điều 14 Bộ luật Lao động 2019 — hợp đồng lao động có thể giao kết qua phương tiện điện tử dưới hình thức thông điệp dữ liệu, có giá trị như hợp đồng bằng văn bản nếu tuân thủ pháp luật về giao dịch điện tử. Đây **không phải chữ ký số PKI**, độ tin cậy pháp lý thấp hơn chuẩn Nghị định 337/2025, nhưng đáp ứng đủ 4 yếu tố cơ bản:
1. Xác định được danh tính người ký (qua OTP gửi về email/SĐT đã xác thực trong hệ thống).
2. Thể hiện rõ ý chí đồng ý (bước tick xác nhận + nhập OTP, không phải click nhầm).
3. Không bị sửa đổi sau khi ký (file PDF cuối cùng bị khóa, không cho ghi đè).
4. Chứng minh được thời điểm ký (ghi nhận qua `AuditLogEntity` có sẵn).

> Nếu sau này công ty cần nâng cấp lên chuẩn Nghị định 337/2025 (tích hợp Provider như VNPT/MISA/FPT), phần khung dữ liệu (`signingStatus`, audit log) vẫn tái sử dụng được — chỉ cần thêm field `platformContractId`, `econtractProviderRef` và thay đổi phần thực thi ký.

---

## 2. Nguyên tắc quan trọng: dùng lại `AuditLogEntity` có sẵn

**Không tạo bảng log riêng cho việc ký.** Toàn bộ thông tin ký (ai ký, lúc nào, từ đâu, xác thực bằng gì) được ghi qua `AuditLogEntity` đã có sẵn trong hệ thống, tận dụng đúng các field:

| Field `AuditLogEntity` | Cách dùng khi ghi log ký hợp đồng |
|---|---|
| `user` | Công ty: HR đang đăng nhập. Nhân viên: **có thể null** nếu ký qua link public chưa đăng nhập — định danh nằm trong `newValue` |
| `action` | `"CONTRACT_SIGNED_COMPANY"` hoặc `"CONTRACT_SIGNED_EMPLOYEE"` |
| `entityType` | `"EmployeeContract"` |
| `entityId` | ID của hợp đồng |
| `oldValue` | JSON: `{"signingStatus": "..."}` (trạng thái trước khi ký) |
| `newValue` | JSON: `{"signingStatus": "...", "signerFullName": "...", "otpVerifiedVia": "EMAIL", "signatureImageKey": "..."}` |
| `ipAddress` | Lấy từ request (`X-Forwarded-For` / remote addr) |
| `userAgent` | Lấy từ header `User-Agent` |
| `occurredAt` | Thời điểm ký thực tế |

Muốn biết ai ký lúc nào → query `AuditLog` theo `entityType = 'EmployeeContract' AND entityId = {id} AND action LIKE 'CONTRACT_SIGNED%'`, **không cần join thêm bảng nào khác**.

---

## 3. Thay đổi Entity

### 3.1. `EmployeeContractEntity` — bổ sung field

```java
@Column(name = "signing_status")
@Enumerated(EnumType.STRING)
@Builder.Default
private SigningStatusEnum signingStatus = SigningStatusEnum.PENDING_COMPANY_SIGN;

@Column(name = "signing_token")
private String signingToken; // token duy nhất cho link ký công khai của nhân viên

@Column(name = "signing_token_expires_at")
private LocalDateTime signingTokenExpiresAt;
```

> Không lưu `companySignedAt`/`companySignedBy`/`employeeSignedAt` trực tiếp trên entity — các mốc thời gian và người thực hiện đã có đầy đủ trong `AuditLogEntity`, tránh lưu trùng dữ liệu ở 2 nơi.

### 3.2. Enum mới — `SigningStatusEnum`
```java
public enum SigningStatusEnum {
    PENDING_COMPANY_SIGN,   // vừa tạo/sinh file, công ty chưa ký
    PENDING_EMPLOYEE_SIGN,  // công ty đã ký, chờ nhân viên
    FULLY_SIGNED            // cả 2 bên đã ký, khóa hợp đồng
}
```

### 3.3. `FileMetadataEntity` — không đổi cấu trúc, nhưng cần lưu 2 phiên bản file

Khi hợp đồng có ký điện tử, cần phân biệt:
- File PDF gốc (trước ký) — giữ lại làm lịch sử.
- File PDF cuối cùng (sau khi cả 2 bên ký, có nhúng thông tin xác nhận) — đây là file chính thức, dùng để tải/xem.

→ Đề xuất: `EmployeeContractEntity` giữ `fileMetadata` trỏ tới **bản mới nhất** (file đã ký đủ), đồng thời có thêm quan hệ phụ `originalFileMetadata` (nullable) trỏ tới bản gốc trước ký, phục vụ tra cứu khi cần đối chiếu.

```java
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "original_file_metadata_id")
private FileMetadataEntity originalFileMetadata;
```

---

## 4. Luồng nghiệp vụ — 3 bước

```
[Hợp đồng đã có file PDF — từ Nhánh A hoặc Nhánh B]
                    │
                    ▼
        signingStatus = PENDING_COMPANY_SIGN
                    │
        HR bấm "Ký hợp đồng" (đăng nhập, re-auth)
                    │
                    ▼
POST /contracts/{id}/sign-company
  - Ghi AuditLog (action=CONTRACT_SIGNED_COMPANY)
  - signingStatus → PENDING_EMPLOYEE_SIGN
  - Sinh signingToken (UUID), hạn 7 ngày
  - Gửi email cho nhân viên: link /contracts/sign/{signingToken}
                    │
                    ▼
    Nhân viên mở link (KHÔNG cần đăng nhập hệ thống)
                    │
GET /contracts/sign/{signingToken}
  - Validate token còn hạn, chưa dùng
  - Trả về: thông tin hợp đồng (tóm tắt) + file PDF công ty đã ký (preview)
  - Gửi OTP về email/SĐT nhân viên đã đăng ký trong hệ thống
                    │
    Nhân viên xem hợp đồng, nhập OTP, vẽ chữ ký (canvas) hoặc tick xác nhận
                    │
                    ▼
POST /contracts/sign/{signingToken}/confirm
  Request: { otp, signatureImageBase64 (optional) }
  - Verify OTP
  - Upload chữ ký (nếu có) lên MinIO
  - Ghi AuditLog (action=CONTRACT_SIGNED_EMPLOYEE)
  - signingStatus → FULLY_SIGNED
  - Render lại PDF: chèn block "Đã ký bởi {tên} lúc {thời gian} - IP: {ip}"
    vào cuối văn bản (dùng lại OpenHTMLToPDF)
  - Upload file PDF cuối cùng lên MinIO, cập nhật fileMetadata
  - Vô hiệu hóa signingToken (đánh dấu đã dùng / hết hạn ngay)
                    │
                    ▼
        signingStatus = FULLY_SIGNED
   (khóa: không cho sửa nội dung, không cho generate lại,
    chỉ cho xem/tải file cuối cùng)
```

---

## 5. API cần triển khai

### 5.1. `POST /contracts/{id}/sign-company`
- **Auth:** bắt buộc, chỉ role HR/Admin có quyền quản lý hợp đồng.
- **Request:** không cần body (có thể thêm `confirmPassword` nếu muốn bước re-auth chặt hơn).
- **Response:** `EmployeeContractResponse` (kèm `signingStatus` mới).
- **Validate:**
  - Hợp đồng phải đang ở `signingStatus = PENDING_COMPANY_SIGN`.
  - Hợp đồng phải có `fileMetadata` (đã có file PDF) — nếu chưa có file, chặn với lỗi rõ ràng.
- **Side effect:** sinh `signingToken`, gửi email cho nhân viên (dùng lại hạ tầng gửi mail sẵn có nếu có).

### 5.2. `GET /contracts/sign/{signingToken}`
- **Auth:** không cần (public endpoint), bảo mật dựa vào độ khó đoán của token (UUID) + hạn sử dụng.
- **Response:**
```json
{
  "contractSummary": { "employeeName", "contractType", "baseSalary", "startDate", "endDate" },
  "companySignedFileUrl": "presigned-url-tam-thoi",
  "tokenExpiresAt": "..."
}
```
- **Side effect:** gửi OTP tới email/SĐT nhân viên (mỗi lần gọi lại endpoint này có thể cần rate-limit để tránh spam OTP — xem mục 7).
- **Validate:** token tồn tại, chưa hết hạn, `signingStatus` đang đúng `PENDING_EMPLOYEE_SIGN` (nếu đã `FULLY_SIGNED` thì trả thông báo "hợp đồng đã được ký").

### 5.3. `POST /contracts/sign/{signingToken}/confirm`
- **Auth:** không cần (public), bảo mật qua OTP.
- **Request:**
```json
{
  "otp": "123456",
  "signatureImageBase64": "data:image/png;base64,..." // optional
}
```
- **Response:** `EmployeeContractResponse` (kèm `signingStatus = FULLY_SIGNED`, link tải file cuối).
- **Validate:**
  - OTP đúng, chưa hết hạn (thường 5 phút), chưa dùng.
  - Token còn hiệu lực, đúng trạng thái `PENDING_EMPLOYEE_SIGN`.
- **Side effect:** thực hiện toàn bộ luồng ở mục 4 (ghi audit log, render PDF cuối, upload MinIO, khóa token).

### 5.4. `GET /contracts/{id}/signing-history` (tuỳ chọn, phục vụ xem trong Tab 2 — Hợp đồng)
- **Auth:** bắt buộc, role HR/Admin.
- **Response:** danh sách các bản ghi `AuditLog` liên quan tới hợp đồng này (`action LIKE 'CONTRACT_SIGNED%'`), hiển thị ai ký, lúc nào, từ IP nào.

---

## 6. DTO cần tạo/sửa

### 6.1. `SignCompanyRequest` (mới, có thể để trống nếu không cần re-auth)
```java
public class SignCompanyRequest {
    private String confirmPassword; // optional, nếu muốn bắt xác nhận lại mật khẩu
}
```

### 6.2. `SignEmployeeConfirmRequest` (mới)
```java
public class SignEmployeeConfirmRequest {
    @NotBlank
    private String otp;

    private String signatureImageBase64; // optional
}
```

### 6.3. `ContractSigningLinkResponse` (mới, trả về cho bước GET link ký)
```java
public class ContractSigningLinkResponse {
    private String employeeName;
    private ContractTypeEnum contractTypeEnum;
    private BigDecimal baseSalary;
    private LocalDate startDate;
    private LocalDate endDate;
    private String companySignedFileUrl; // presigned URL tạm thời
    private LocalDateTime tokenExpiresAt;
}
```

### 6.4. `EmployeeContractResponse` — bổ sung field
```java
private SigningStatusEnum signingStatus;
```

---

## 7. Bảo mật & Edge cases cần xử lý

1. **Rate-limit OTP**: giới hạn số lần gửi OTP theo `signingToken` (ví dụ tối đa 5 lần/giờ), tránh bị lạm dụng để spam SMS/email hoặc brute-force.
2. **Rate-limit xác thực OTP**: giới hạn số lần nhập sai OTP (ví dụ khóa sau 5 lần sai liên tiếp, yêu cầu gửi lại OTP mới).
3. **Token dùng 1 lần**: sau khi `signingStatus = FULLY_SIGNED`, `signingToken` phải bị vô hiệu hóa ngay — không cho gọi lại `/confirm` lần 2 dù có đúng OTP cũ.
4. **Hết hạn token**: mặc định 7 ngày kể từ khi công ty ký — nếu hết hạn mà nhân viên chưa ký, cần API riêng cho phép HR **sinh lại token mới** (không sinh tự động, tránh gửi email trùng lặp).
5. **Hợp đồng đã `TERMINATED` trước khi ký xong**: chặn không cho tiếp tục luồng ký nếu hợp đồng bị chấm dứt giữa chừng (edge case hiếm nhưng cần validate ở bước `/confirm`).
6. **Render PDF cuối cùng lỗi ký tự tiếng Việt / `&`**: áp dụng lại đúng 2 fix đã có — escape XML entity qua Jsoup trước khi render, và dùng font Source Sans 3 (hỗ trợ tiếng Việt) đã đăng ký sẵn cho `OpenHTMLToPDF`.
7. **Chữ ký vẽ tay (`signatureImageBase64`)**: giới hạn kích thước ảnh (ví dụ tối đa 500KB sau decode), validate đúng định dạng PNG/JPEG trước khi upload MinIO.
8. **Không cho sửa/generate lại hợp đồng khi đã `FULLY_SIGNED`**: chặn ở tầng service cho mọi API có khả năng thay đổi nội dung hợp đồng (kể cả upload file mới) một khi `signingStatus = FULLY_SIGNED`.

---

## 8. Tóm tắt danh sách API cần code

| API | Method | Auth | Mục đích |
|---|---|---|---|
| `/contracts/{id}/sign-company` | POST | Bắt buộc (HR/Admin) | Công ty ký, sinh token gửi cho nhân viên |
| `/contracts/sign/{signingToken}` | GET | Public (qua token) | Nhân viên xem hợp đồng, nhận OTP |
| `/contracts/sign/{signingToken}/confirm` | POST | Public (qua token + OTP) | Nhân viên xác nhận ký, chốt file cuối |
| `/contracts/{id}/signing-history` | GET | Bắt buộc (HR/Admin) | Xem lịch sử ký (query từ AuditLog) |
| `/contracts/{id}/resend-signing-link` | POST | Bắt buộc (HR/Admin) | Sinh lại token mới khi token cũ hết hạn |
