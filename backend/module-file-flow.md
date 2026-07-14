# Sơ đồ luồng — Module quản lý File (Storage + Metadata)

## Kiến trúc 3 tầng

```mermaid
flowchart LR
    Client["Module nghiệp vụ khác<br/><small>(Contract, Avatar, Document...)</small>"]
    IFS["IFileService<br/><small>Tầng điều phối (facade)</small>"]
    Storage["IFileStorageService<br/><small>Chỉ làm việc với MinIO</small>"]
    Meta["IFileMetadataService<br/><small>Chỉ làm việc với MySQL</small>"]
    MinIO[("MinIO / S3")]
    DB[("MySQL<br/>file_metadata")]

    Client --> IFS
    IFS --> Storage
    IFS --> Meta
    Storage --> MinIO
    Meta --> DB
```

**Nguyên tắc:** Mọi module nghiệp vụ khác chỉ inject `IFileService`, không gọi trực tiếp `IFileStorageService` hoặc `IFileMetadataService`.

---

## 1. Luồng Upload File

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
    X3["File orphan trên MinIO<br/><small>Không có metadata trỏ tới<br/>→ job quét dọn định kỳ</small>"]

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

**Business rule:**
- Upload MinIO **trước**, ghi metadata DB **sau** — nếu DB fail, chỉ tạo ra file "rác" trên storage (dễ dọn dẹp qua job đối soát), không gây mất mát dữ liệu nghiêm trọng.
- `fileKey` luôn do `IFileService` sinh ra, không cho phép caller tự truyền vào để đảm bảo tính duy nhất và convention đặt tên nhất quán.

---

## 2. Luồng Download / Lấy URL File

```mermaid
flowchart TD
    A["Client gọi<br/>fileService.getDownloadUrl(fileKey)"]
    B["fileMetadataService.getByFileKey()<br/><small>Truy vấn MySQL</small>"]
    C{"Metadata<br/>tồn tại?"}
    D{"status<br/>= ACTIVE?"}
    E["fileStorageService.getPresignedUrl()<br/><small>Sinh URL có thời hạn (VD: 15 phút)</small>"]
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

**Business rule:**
- Client (FE) tải file **trực tiếp từ MinIO** qua presigned URL, không proxy qua backend → giảm tải cho server ứng dụng.
- Luôn check `status = ACTIVE` trước khi sinh URL, tránh cấp quyền truy cập file đã bị soft-delete.

---

## 3. Luồng Xóa File

```mermaid
flowchart TD
    A["Client gọi<br/>fileService.deleteFile(fileKey)"]
    B["fileStorageService.delete()<br/><small>Xóa file vật lý khỏi MinIO</small>"]
    C{"Xóa MinIO<br/>thành công?"}
    D["fileMetadataService.hardDelete()<br/><small>Xóa record khỏi MySQL</small>"]
    E["Hoàn tất xóa"]
    X1["Throw FileStorageException<br/><small>Dừng lại — KHÔNG xóa metadata<br/>Tránh mất metadata trong khi file vật lý còn tồn tại</small>"]

    A --> B
    B --> C
    C -->|Thất bại| X1
    C -->|Thành công| D
    D --> E
```

**Business rule:**
- Thứ tự bắt buộc: **xóa MinIO trước, xóa DB sau** — ngược lại với luồng upload, vì mục tiêu là tránh để lại metadata "mồ côi" trỏ tới file đã không còn tồn tại (gây lỗi 404 khi client cố tải file theo metadata vẫn còn trong danh sách).
- Cân nhắc dùng `softDelete()` thay vì `hardDelete()` nếu cần giữ lịch sử/audit trail (tùy chính sách nghiệp vụ, VD: hợp đồng đã ký không nên xóa cứng).

---

## 4. Luồng Tìm kiếm / Phân trang File (Admin)

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

**Business rule:**
- `search()` chỉ thao tác trên `IFileMetadataService` (không đụng tới MinIO) — nhanh, không tốn round-trip tới storage.
- Nếu cần hiển thị presigned URL ngay trong bảng danh sách (để admin bấm xem trực tiếp), nên tách endpoint riêng hoặc bổ sung logic gọi `IFileStorageService.getPresignedUrl()` cho từng item ở tầng `IFileService`, tránh sinh URL cho toàn bộ danh sách nếu không cần thiết (tốn chi phí gọi MinIO không đáng có khi chỉ cần xem metadata).

---

## Tổng hợp exception theo từng luồng

| Luồng | Exception | HTTP Status | Message trả về client |
|---|---|---|---|
| Upload | `BusinessException` | 400 | "File không được để trống" |
| Upload | `FileStorageException` | 500 | "Lỗi hệ thống lưu trữ file, vui lòng thử lại sau" |
| Download | `ResourceNotFoundException` | 404 | "Không tìm thấy file" |
| Download | `BusinessException` | 400 | "File không khả dụng hoặc đã bị xóa" |
| Xóa | `FileStorageException` | 500 | "Lỗi hệ thống lưu trữ file, vui lòng thử lại sau" |
| Tìm kiếm | — | — | Không có exception đặc thù, dùng validate chuẩn của Spring |
