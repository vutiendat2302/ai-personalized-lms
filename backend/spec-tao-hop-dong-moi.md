# Đặc tả: Tạo hợp đồng mới cho nhân viên

## 1. Quy tắc nghiệp vụ (Business rules)

### 1.1. Điều kiện tiên quyết
- Một nhân viên **chỉ được phép có tối đa 1 hợp đồng ở trạng thái `ACTIVE`** tại một thời điểm.
- Khi admin/hr bấm nút **"Tạo hợp đồng mới"**:
  - BE kiểm tra nhân viên hiện có hợp đồng nào đang `ACTIVE` không.
  - **Nếu có** → chặn thao tác tạo mới, trả lỗi rõ ràng, yêu cầu **chấm dứt hợp đồng cũ trước** (chuyển status sang `TERMINATED`, set `terminatedAt`).
  - **Nếu không có** (chưa từng có hợp đồng, hoặc hợp đồng cũ đã `EXPIRED`/`TERMINATED`) → cho phép tạo mới.

```
GET /contracts/employee/{employeeId}/active-check
Response: { "hasActiveContract": boolean, "activeContractId": Long | null }
```

- FE gọi API check này **trước khi mở form tạo hợp đồng**. Nếu `hasActiveContract = true`:
  - Hiện modal cảnh báo: *"Nhân viên đang có hợp đồng hiệu lực. Vui lòng chấm dứt hợp đồng hiện tại trước khi tạo hợp đồng mới."*
  - Nút hành động trong modal: **"Chấm dứt hợp đồng cũ"** → gọi API chấm dứt → sau khi thành công mới cho tiếp tục sang bước tạo hợp đồng mới.

### 1.2. API chấm dứt hợp đồng (đã có/mở rộng)
```
PATCH /contracts/{id}/terminate
Request: { "terminationReason": String (optional) }
Response: EmployeeContractResponse (status = TERMINATED)
```
- Set `status = TERMINATED`, `terminatedAt = now()`, `updatedBy = currentUser`.
- Cần thêm field `terminatedAt` (LocalDateTime) và `terminationReason` (String, nullable) vào `EmployeeContractEntity` nếu chưa có.
- Lưu auditLog 
---

## 2. Luồng tạo hợp đồng mới — 2 nhánh

Sau khi xác nhận nhân viên **không có hợp đồng active**, hiện màn hình chọn 1 trong 2 tùy chọn:

```
┌─────────────────────────────────────────┐
│  Tạo hợp đồng mới                        │
│                                           │
│  ○ Đã có file hợp đồng sẵn                │
│  ○ Chưa có file — tạo mới trên hệ thống   │
│                                           │
│              [ Tiếp tục ]                │
└─────────────────────────────────────────┘
```

### 2.1. Nhánh A — "Đã có file hợp đồng sẵn"

Giữ nguyên logic đã thống nhất trước đó (tách 2 API, không nhận `fileKey`/`status` từ client):

**Bước A1 — Tạo record hợp đồng**
```
POST /contracts
Request: CreateEmployeeContractRequest (không có fileKey, không có status)
Response: EmployeeContractResponse (id vừa tạo, status = ACTIVE mặc định)
```

**Bước A2 — Upload file đính kèm**
```
POST /contracts/{id}/upload-file   (multipart/form-data)
Request: file (binary)
Response: EmployeeContractResponse (kèm fileMetadata đầy đủ)
```
- BE nhận file → upload MinIO → tạo `FileMetadataEntity` (fileName, fileSize, contentType, objectKey) → set `file_metadata_id` cho contract.
- FE: khi ấn tạo hợp đồng mở ra hợp đồng: chuaws phần nhập thông tin của hợp đồng và phần upload file, nếu thiếu thông tin thì chưa cho tạo hợp đồng 

### 2.2. Nhánh B — "Chưa có file — tạo mới trên hệ thống"

Đây là luồng sinh file PDF từ mẫu (template), gồm 3 bước con, **kết quả cuối cùng hội tụ về chung 1 điểm với Nhánh A** (đã có `fileKey`/`fileMetadata` → xử lý như cũ).

**Bước B1 — Chọn loại hợp đồng (Contract type)**
- User chọn 1 trong các `ContractTypeEnum`: `PROBATION`, `FIXED_TERM`, `INDEFINITE`, `SEASONAL`.
- Mỗi loại hợp đồng ứng với 1 **template PDF khác nhau** (nội dung điều khoản pháp lý khác nhau). (teamplate html) 

```
GET /contract-templates?type={contractTypeEnum}
Response: { "templateId": Long, "templateName": String, "placeholders": [String] }
```
- `placeholders`: danh sách các biến động trong template (VD: `employeeName`, `startDate`, `endDate`, `baseSalary`, `salaryType`, `signedAt`...) để FE biết cần render field nhập nào tương ứng.

**Bước B2 — Setup nội dung file (form nhập liệu + xem trước trực tiếp)**
- FE hiện form nhập các trường tương ứng `placeholders` (loại hợp đồng, ngày bắt đầu/kết thúc, lương, hình thức trả lương, ngày ký...).
- Song song bên cạnh là **khu vực xem trước (preview)**:
  - Preview này **xử lý hoàn toàn ở FE** (JS render lại 1 bản mẫu HTML tương ứng, thay placeholder bằng giá trị đang nhập theo thời gian thực — KHÔNG gọi BE mỗi lần gõ phím).
  - Đây chỉ là bản xem gần đúng, chưa phải file PDF thật.
- (Tùy chọn bổ sung nếu FE thấy live-preview phức tạp): thay bằng nút **"Xem thử"** gọi API preview riêng, không bắt buộc real-time.

```
POST /contract-templates/{templateId}/preview   (optional, nếu cần bản preview do BE render)
Request: { placeholder data... }
Response: { "previewHtml": String }  // hoặc trả PDF tạm thời, không lưu MinIO
```

**Bước B3 — Xác nhận "Tiếp tục" → sinh file thật + tạo hợp đồng**

Khi user xem xong, bấm **"Tiếp tục"**, gộp làm 1 lần gọi BE (khuyến nghị dùng 1 API tổng hợp để đảm bảo tính toàn vẹn — tạo record + sinh file trong cùng transaction):

```
POST /contracts/generate
Request: {
  employeeId, contractTypeEnum, startDate, endDate,
  baseSalary, salaryTypeEnum, signedAt,
  templateId
}
Response: EmployeeContractResponse (đã có đầy đủ fileMetadata)
```

Xử lý phía BE:
1. Validate không có hợp đồng active khác (double-check, tránh race condition).
2. Tạo `EmployeeContractEntity` (status mặc định `ACTIVE`).
3. Lấy template theo `templateId`, điền dữ liệu vào chỗ trống, render ra file **PDF** (dùng thư viện render HTML → PDF, ví dụ OpenHTMLToPDF/Flying Saucer cho Java — không cần qua bước Word trung gian).
4. Upload file PDF vừa sinh lên MinIO, tạo `FileMetadataEntity`.
5. Gắn `file_metadata_id` vào contract, lưu DB.
6. Trả về `EmployeeContractResponse` đầy đủ — **từ đây trở đi, hợp đồng này có file giống hệt hợp đồng ở Nhánh A**, các thao tác xem/tải file dùng chung 1 flow presigned URL đã thống nhất trước đó.

> Lưu ý quan trọng: **API B3 KHÔNG nhận `fileKey` từ client** — toàn bộ việc sinh file + lấy key đều do BE tự xử lý nội bộ, giữ đúng nguyên tắc đã thống nhất ở Nhánh A (client không được tự gửi `fileKey`).

---

## 3. Sơ đồ luồng tổng quát

```
[Bấm "Tạo hợp đồng mới"]
        │
        ▼
[BE check active contract]
        │
   ┌────┴────┐
  Có           Không
   │             │
   ▼             ▼
[Chấm dứt HĐ cũ]  [Chọn nhánh: Có file / Chưa có file]
   │                       │
   └──── (xong) ─────►     │
                    ┌───────┴────────┐
                    │                │
              Nhánh A: Có file   Nhánh B: Chưa có file
                    │                │
           POST /contracts      Chọn contractTypeEnum
                    │                │
           POST /contracts/       Nhập form + xem preview (FE)
             {id}/upload-file        │
                    │           POST /contracts/generate
                    │                │
                    └───── hội tụ ───┘
                             │
                             ▼
                EmployeeContractResponse
                (có đầy đủ fileMetadata)
                             │
                             ▼
                  Hiện trên Tab 2 — Hợp đồng
                (card ACTIVE + nút tải file)
```

---

## 4. Thay đổi cần thiết ở Entity / DTO

### 4.1. `EmployeeContractEntity` — bổ sung field
```java
@Column(name = "terminated_at")
private LocalDateTime terminatedAt;

@Column(name = "termination_reason")
private String terminationReason;
```
- Cân nhắc bỏ field `fileKey` (String) trực tiếp trên entity này nếu đã có quan hệ `fileMetadata` (OneToOne tới `FileMetadataEntity`) — tránh 2 nguồn dữ liệu cho cùng 1 file.

### 4.2. `CreateEmployeeContractRequest` — dùng cho Nhánh A (bước A1)
```java
public class CreateEmployeeContractRequest {
    @NotNull private Long employeeId;
    @NotNull private ContractTypeEnum contractTypeEnum;
    @NotNull private LocalDate startDate;
    private LocalDate endDate;
    @NotNull @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal baseSalary;
    @NotNull private SalaryTypeEnum salaryTypeEnum;
    private LocalDateTime signedAt;
    // KHÔNG có fileKey, KHÔNG có status
}
```

### 4.3. `GenerateEmployeeContractRequest` — dùng cho Nhánh B (bước B3), mới
```java
public class GenerateEmployeeContractRequest {
    @NotNull private Long employeeId;
    @NotNull private ContractTypeEnum contractTypeEnum;
    @NotNull private Long templateId;
    @NotNull private LocalDate startDate;
    private LocalDate endDate;
    @NotNull @DecimalMin(value = "0.0", inclusive = false)
    private BigDecimal baseSalary;
    @NotNull private SalaryTypeEnum salaryTypeEnum;
    private LocalDateTime signedAt;
}
```

### 4.4. `TerminateContractRequest` — mới
```java
public class TerminateContractRequest {
    private String terminationReason; // optional
}
```

### 4.5. `ContractTemplateEntity` — mới (nếu chưa có)
```java
@Entity
public class ContractTemplateEntity {
    @Id @SnowflakeId
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "contract_type")
    @Enumerated(EnumType.STRING)
    private ContractTypeEnum contractTypeEnum;

    @Column(name = "template_content", columnDefinition = "TEXT")
    private String templateContent; // HTML template với placeholder {{...}}

    @Column(name = "version")
    private Integer version;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private BaseStatusEnum status; // ACTIVE / INACTIVE
}
```

---

## 5. Validate & Edge cases cần xử lý ở BE

1. **Race condition**: 2 request tạo hợp đồng cùng lúc cho 1 nhân viên → dùng constraint unique (partial index: `employee_id` where `status = 'ACTIVE'`) ở DB để chặn tuyệt đối, không chỉ dựa vào check ở tầng service.
2. **`endDate` phải sau `startDate`** nếu `endDate` khác null.
3. Nhánh B: nếu `templateId` không tồn tại hoặc không thuộc đúng `contractTypeEnum` đã chọn → trả lỗi 400.
4. Nhánh A: nếu bước A1 thành công nhưng A2 (upload file) thất bại hoặc user bỏ dở → hợp đồng vẫn ở trạng thái `ACTIVE` nhưng **không có file**. Cần quyết định: có chặn các thao tác khác (như tính lương) với hợp đồng chưa có file không, hoặc cho phép upload bổ sung sau tại tab chi tiết hợp đồng.
5. File upload giới hạn định dạng (`.pdf`, `.docx`) và dung lượng (ví dụ tối đa 10MB) — validate ở cả FE và BE.
6. MinIO bucket lưu hợp đồng nên để **private**, truy cập qua **presigned URL có thời hạn** (sinh khi user bấm tải, không trả URL tĩnh trong response mặc định).

---

## 6. Tóm tắt danh sách API cần code

| API | Method | Mục đích |
|---|---|---|
| `/contracts/employee/{employeeId}/active-check` | GET | Kiểm tra có hợp đồng active không |
| `/contracts/{id}/terminate` | PATCH | Chấm dứt hợp đồng cũ |
| `/contracts` | POST | Tạo hợp đồng (Nhánh A, bước A1) |
| `/contracts/{id}/upload-file` | POST (multipart) | Upload file đính kèm (Nhánh A, bước A2) |
| `/contract-templates?type=` | GET | Lấy template theo loại hợp đồng (Nhánh B, bước B1) |
| `/contract-templates/{templateId}/preview` | POST | (Optional) Preview do BE render |
| `/contracts/generate` | POST | Sinh file PDF + tạo hợp đồng (Nhánh B, bước B3) |
| `/contracts/{id}/download-url` | GET | Lấy presigned URL để tải file |
