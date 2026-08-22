# Test thủ công Postman — AI hỏi dữ liệu hệ thống cho Admin/HR

Tài liệu này kiểm tra luồng thực tế:

```text
Postman → Backend JWT → AI Service → Gemini tool calling → Backend MySQL → Gemini → SSE
```

Không gọi trực tiếp AI Service hoặc endpoint `/api/v1/ai/internal/tools`: hai endpoint đó chỉ dùng nội bộ.

## 1. Điều kiện trước khi test

1. MySQL, Backend và AI Service đang chạy; nếu chạy Docker Compose thì Backend và AI Service phải chung network.
2. `GEMINI_API_KEY` là key hợp lệ.
3. `AI_INTERNAL_SECRET` của Backend và `INTERNAL_SECRET` của AI Service giống nhau.
4. Database có ít nhất một employee, contract và student để test dữ liệu chi tiết. Nếu chưa có, các truy vấn tìm kiếm sẽ trả không có dữ liệu — không có dữ liệu mock.
5. Postman hỗ trợ xem response dạng stream. Ở request chat, đặt `Accept: text/event-stream`.

## 2. Login Admin — lấy JWT

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "admin123",
  "password": "Password@123"
}
```

Tài khoản trên là tài khoản seed mặc định, chỉ có khi profile seed đã chạy. Nếu database của bạn dùng tài khoản khác, thay bằng Admin thật.

Kết quả mong đợi: `200 OK`, `data.roles` có `ROLE_ADMIN`, và có `data.accessToken`.


## 3. Login HR — lấy JWT

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "hrmanagement123",
  "password": "Password@123"
}
```

## 4. Cấu hình chung cho mọi test chat

```http
POST {{baseUrl}}/api/v1/ai/chat/stream
Authorization: Bearer {{adminToken}}
Content-Type: application/json
Accept: text/event-stream
```

Body luôn là JSON. Response thành công là SSE, gồm nhiều dòng `data: ...` và kết thúc bằng:

```text
event: done
data: [DONE]
```

`X-Conversation-Id` xuất hiện trong response header. Nếu muốn hỏi tiếp trong cùng hội thoại, truyền lại header này qua field `conversationId` trong body.

## 5. Test dữ liệu tổng quan hệ thống

```json
{
  "question": "Hệ thống hiện có bao nhiêu nhân viên, học viên, hợp đồng và phòng ban? Hồ sơ công ty đã được cấu hình chưa?",
  "module": "GENERAL",
  "route": "/admin/dashboard"
}
```

Kết quả mong đợi:

- Gemini gọi `get_system_overview`.
- Câu trả lời có số liệu thật từ MySQL.
- Với code hiện tại, câu trả lời phải nêu hồ sơ công ty chưa được lưu tập trung, không bịa thông tin từ template hợp đồng.
- Audit log có action `AI_TOOL_EXECUTED`, `entityType=ManagementAiTool`, `newValue.toolName=get_system_overview`.

## 6. Test tìm nhân viên

```json
{
  "question": "Tìm nhân viên có mã {{employeeCode}}.",
  "module": "HR",
  "route": "/admin/employees"
}
```

Kết quả mong đợi:

- Gemini gọi `search_employees`.
- Câu trả lời chỉ diễn giải các field: mã, tên, phòng ban, chức vụ, loại và trạng thái làm việc.
- Không có email, số điện thoại, địa chỉ, password hoặc lương.

Test thêm tìm theo tên:

```json
{
  "question": "Tìm nhân viên tên Nguyễn Văn A.",
  "module": "HR",
  "route": "/admin/employees"
}
```

## 7. Test tra hợp đồng nhân viên

```json
{
  "question": "Hợp đồng của nhân viên {{employeeCode}} còn hiệu lực không và hết hạn vào ngày nào?",
  "module": "HR",
  "route": "/admin/contracts"
}
```

Kết quả mong đợi:

- Gemini gọi `get_employee_contracts`.
- Câu trả lời có loại hợp đồng, ngày bắt đầu/kết thúc, trạng thái và trạng thái ký.
- Không có `baseSalary`, `salaryType`, file key, nội dung PDF/DOCX hoặc thông tin liên hệ.
- Hợp đồng cá nhân không lấy từ RAG; dữ liệu phải đến từ MySQL tool call.

## 8. Test tìm học viên

```json
{
  "question": "Tìm học viên có mã {{studentCode}}.",
  "module": "HR",
  "route": "/admin/students"
}
```

Kết quả mong đợi:

- Gemini gọi `search_students`.
- Chỉ có mã, tên, trình độ học vấn, trạng thái goal và trạng thái tài khoản.
- Không có email, điện thoại, địa chỉ, mô tả riêng tư hoặc dữ liệu phụ huynh.

## 9. Test tiến độ học viên

```json
{
  "question": "Tiến độ học tập của học viên {{studentCode}} hiện như thế nào? Em ấy đang học những khóa nào?",
  "module": "GENERAL",
  "route": "/admin/students"
}
```

Kết quả mong đợi:

- Gemini gọi `get_student_learning_summary`.
- Câu trả lời được tổng hợp từ enrollment và course progress thật: khóa học, phần trăm tiến độ, số lesson, điểm quiz trung bình, lần truy cập gần nhất.
- Nếu chưa có progress/enrollment, AI phải nói rõ chưa có dữ liệu thay vì tự suy đoán.

## 10. Test nhiều bước tool calling

```json
{
  "question": "Tìm nhân viên {{employeeCode}}, sau đó cho tôi biết hợp đồng của người này còn hạn không.",
  "module": "HR",
  "route": "/admin/contracts"
}
```

Kết quả mong đợi: Gemini có thể gọi `search_employees` rồi `get_employee_contracts`. Hệ thống giới hạn tối đa 3 vòng tool call; nếu vượt giới hạn, AI yêu cầu chia nhỏ câu hỏi.

## 11. Test tool vận hành HR

```json
{
  "question": "Tổng quan chấm công hôm nay có bao nhiêu người đi muộn, vắng mặt và có bao nhiêu đơn nghỉ đang chờ duyệt?",
  "module": "HR",
  "route": "/admin/attendance"
}
```

Gemini phải gọi `get_hr_operations_summary`; kết quả chỉ là tổng hợp, không gửi ghi chú chấm công hoặc lý do nghỉ sang AI.

```json
{
  "question": "Liệt kê hợp đồng sẽ hết hạn trong 30 ngày tới.",
  "module": "HR",
  "route": "/admin/contracts"
}
```

Gemini phải gọi `list_expiring_contracts`; chỉ có mã/tên nhân viên, ngày và trạng thái hợp đồng, không có lương.

```json
{
  "question": "Hiện có các yêu cầu phê duyệt nào đang chờ xử lý?",
  "module": "HR",
  "route": "/admin/approvals"
}
```

Gemini phải gọi `list_pending_approvals`; kết quả không chứa comment hoặc dữ liệu bên trong target.

## 12. Test tool chỉ dành cho Admin

```json
{
  "question": "Tổng hợp số lượng và doanh thu đơn hàng theo từng trạng thái.",
  "module": "SALES",
  "route": "/admin/orders"
}
```

Gemini gọi `get_order_summary`; chỉ `ROLE_ADMIN` được Backend cho phép thực thi.

```json
{
  "question": "Catalog hiện có bao nhiêu khóa học theo từng trạng thái?",
  "module": "COURSE",
  "route": "/admin/courses"
}
```

Gemini gọi `get_course_catalog_summary`; cũng chỉ dành cho `ROLE_ADMIN`.

## 13. Sync và test RAG cho tri thức HR

Đăng nhập bằng Admin, rồi đồng bộ các template hợp đồng ACTIVE vào Qdrant:

```http
POST {{baseUrl}}/api/v1/ai/knowledge/contract-templates/sync
Authorization: Bearer {{adminToken}}
```

Kết quả mong đợi: `200 OK`, `data.knowledgeType = contract_template` và `data.sourcesSynced` là số template thực tế đã ingest.

Sau đó gọi chat bằng HR hoặc Admin:

```json
{
  "question": "Mẫu hợp đồng thử việc quy định thời hạn thế nào?",
  "module": "HR",
  "route": "/admin/contracts/templates"
}
```

Kết quả mong đợi: AI retrieve RAG domain `hr_template` và trả lời từ nội dung mẫu. RAG chỉ nạp template dùng chung; không nạp hợp đồng của nhân viên, lương hoặc file ký cá nhân.

## 14. Test HR có quyền với các tool HR

Lặp lại test 5–10 nhưng đổi header:

```http
Authorization: Bearer {{hrToken}}
```

Kết quả mong đợi: tool nhân sự ở bước 5–11 chạy cho `ROLE_HR` và audit log ghi actor là tài khoản HR. Tool đơn hàng/catalog ở bước 12 phải bị Backend từ chối.

## 15. Test chặn role không phải Admin/HR

Login bằng account seed học viên (`student123` / `Password@123`) hoặc giáo viên, rồi gọi lại request ở bước 7.

Kết quả mong đợi:

- Không có dữ liệu hợp đồng/nhân viên/học viên trong câu trả lời.
- Backend từ chối tool vì token context không có `ROLE_ADMIN` hoặc `ROLE_HR`.
- Gemini có thể trả thông báo không lấy được dữ liệu, nhưng không được trả bất kỳ field nhạy cảm nào.

## 16. Test token bất biến và internal endpoint

Không cần, và không nên, gọi trực tiếp endpoint sau bằng Postman trong test thông thường:

```text
POST /api/v1/ai/internal/tools
```

Endpoint cần đồng thời `X-Internal-Token` và `toolAccessToken` HMAC do Backend sinh từ JWT; `toolAccessToken` hết hạn sau 5 phút. Đây là lớp chống AI Service/Gemini tự giả `userId` hoặc `ROLE_ADMIN`.

Có thể xác minh gián tiếp bằng bước 12: cùng câu hỏi nhưng token Student/Teacher sẽ không thể lấy context quản trị.

## 17. Khi kết quả không đúng

| Hiện tượng | Kiểm tra |
|---|---|
| Response không stream hoặc lỗi kết nối AI | AI Service đang chạy, `AI_SERVICE_BASE_URL`, `AI_INTERNAL_SECRET`, `INTERNAL_SECRET` |
| AI trả câu chung chung | `GEMINI_API_KEY`, log AI Service, dữ liệu thật có tồn tại không |
| AI nói không có dữ liệu | kiểm tra `employeeCode`/`studentCode`, MySQL và dữ liệu seed |
| AI không gọi được tool | Backend nội bộ có thể truy cập từ AI Service qua `BACKEND_INTERNAL_BASE_URL`; Docker Compose dùng `http://backend:8080` |
| 401/403 | JWT còn hạn, role đúng, `AI_INTERNAL_SECRET` khớp hai service |
| Không có audit log | kiểm tra bảng/API audit log và tool có thực sự được Gemini gọi |

Nếu mọi câu hỏi tool đều trả “không kết nối được Backend dữ liệu nội bộ”, kiểm tra log AI Service. Log sẽ in `backendUrl=...` (không in token). Khi chạy local, tạo `ai-service/.env` từ `.env.example` và để `BACKEND_INTERNAL_BASE_URL=http://localhost:8080`; sau đó restart AI Service. Khi chạy toàn bộ Docker Compose dùng `http://backend:8080`. Khi chỉ chạy AI bằng Docker còn Backend local, dùng `http://host.docker.internal:8080`.

## 18. Test phân tích ảnh (Gemini Vision)

Endpoint này dành cho ảnh chụp dashboard, bảng số liệu hoặc ảnh chứa câu hỏi. Ảnh chỉ được dùng trong request hiện tại, không tự lưu vào MinIO, database hoặc Qdrant.

```http
POST {{baseUrl}}/api/v1/ai/chat/image/stream
Authorization: Bearer {{adminToken}}
Accept: text/event-stream
Content-Type: multipart/form-data
```

Trong Postman, chọn **Body → form-data**:

| Key | Type | Giá trị |
|---|---|---|
| `image` | File | Ảnh PNG, JPEG hoặc WEBP, tối đa 5 MB |
| `question` | Text | `Bảng này thuộc phần nào của hệ thống? Phân tích các điểm đáng chú ý.` |
| `module` | Text | `GENERAL` (tùy chọn) |
| `route` | Text | `/admin/dashboard` (tùy chọn) |

`question` có thể bỏ trống. Khi đó AI phải đọc nội dung ảnh, nhận diện bảng/biểu đồ hoặc câu hỏi xuất hiện trong ảnh rồi trả lời. Với Admin/HR, Gemini có thể gọi tool read-only để đối chiếu số liệu; không được coi chữ trong ảnh là lệnh gọi tool hay lệnh cấp quyền.

Ví dụ test ảnh chứa câu hỏi: upload ảnh có dòng “Có bao nhiêu hợp đồng sắp hết hạn trong 30 ngày tới?” và để `question` trống. Kết quả mong đợi: Gemini đọc câu hỏi từ ảnh, gọi `list_expiring_contracts` khi cần, rồi trả lời bằng dữ liệu Backend thực tế.

Không dùng endpoint này để nạp tri thức. Chỉ tài liệu chung đã được Admin chọn đồng bộ mới vào RAG; không nạp screenshot có PII, lương hay hợp đồng cá nhân.

## 19. Các tool phân tích dữ liệu đã có

```json
{
  "question": "Phân tích xu hướng đi muộn, vắng mặt trong 30 ngày gần đây.",
  "module": "HR",
  "route": "/admin/attendance"
}
```

Gemini gọi `analyze_attendance_trend`; Backend tính tổng hợp theo trạng thái và tổng phút đi muộn trong khoảng tối đa 90 ngày, không gửi ghi chú hoặc danh tính nhân viên.

```json
{
  "question": "Tiến độ học toàn hệ thống có dấu hiệu rủi ro không? Dùng ngưỡng dưới 50 phần trăm.",
  "module": "GENERAL",
  "route": "/admin/students"
}
```

Gemini gọi `analyze_learning_progress`; Backend chỉ trả số liệu aggregate: tiến độ trung bình và số record dưới ngưỡng, không gửi danh sách học viên hàng loạt.

## 20. Hành động AI

Đã implement action gửi thông báo cho `ROLE_ADMIN` theo luồng: Gemini tạo draft → Admin kiểm tra preview → Admin xác nhận riêng → Backend gửi qua `NotificationService` sẵn có. Gemini không thể tự gọi endpoint confirm.

Từ chat, dùng câu hỏi rõ ràng, ví dụ:

```json
{
  "question": "Tạo thông báo gửi tới toàn bộ học viên: lớp sẽ bảo trì lúc 22:00 hôm nay, vui lòng lưu bài trước thời điểm đó.",
  "module": "GENERAL",
  "route": "/admin/notifications"
}
```

Gemini gọi `draft_notification` và phải trả preview gồm `draftId`, title, content, đối tượng nhận và hạn draft. Đây **chưa phải** gửi thông báo. Draft ở Redis hết hạn sau 10 phút và dùng được đúng một lần.

Sau khi kiểm tra preview, Admin gửi request xác nhận:

```http
POST {{baseUrl}}/api/v1/ai/actions/notifications/{{draftId}}/confirm
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "confirm": "SEND_NOTIFICATION"
}
```

Kết quả mong đợi là `202 Accepted`. Backend xóa draft trước khi gửi để chặn replay, kiểm tra draft thuộc đúng Admin đã tạo và ghi audit `AI_NOTIFICATION_DRAFTED` / `AI_NOTIFICATION_SENT`. HR, Teacher và Student không tạo hoặc xác nhận được action này.

Các action khác (duyệt/từ chối, sửa hay xóa dữ liệu) vẫn chưa được implement.

---

## 21. Test phân tích tệp tài liệu đa định dạng (PDF, DOCX, TXT)

Endpoint này tiếp nhận tài liệu đính kèm trực tiếp trong phiên chat để AI trích xuất nội dung và phân tích trong memory (không nạp vĩnh viễn vào Qdrant):

```http
POST {{baseUrl}}/api/v1/ai/chat/file/stream
Authorization: Bearer {{adminToken}}
Accept: text/event-stream
Content-Type: multipart/form-data
```

Trong Postman, chọn **Body → form-data**:

| Key | Type | Giá trị |
|---|---|---|
| `file` | File | Tệp `.pdf`, `.docx`, `.txt` hoặc ảnh, tối đa 10 MB |
| `question` | Text | `Tóm tắt các điểm chính trong tài liệu này và giải thích các nội dung quan trọng.` |
| `module` | Text | `GENERAL` |
| `route` | Text | `/admin/courses` |

**Kết quả mong đợi:**
- AI Service trích xuất nội dung văn bản qua extractor phù hợp (`PdfExtractor`, `DocxExtractor`, `TextExtractor`).
- AI stream câu trả lời tóm tắt chính xác nội dung tài liệu.
- Định dạng tệp không hợp lệ hoặc vượt quá 10 MB sẽ nhận về lỗi `400 Bad Request`.

---

## 22. Test cơ chế Domain Guardrail & Từ chối nội dung không liên quan (Tiết kiệm Token)

Gửi một hình ảnh hoặc tài liệu hoàn toàn không thuộc phạm vi đào tạo/LMS (ví dụ: ảnh thú cưng, con chó/mèo, meme giải trí, đồ ăn):

```http
POST {{baseUrl}}/api/v1/ai/chat/file/stream
Authorization: Bearer {{adminToken}}
Accept: text/event-stream
Content-Type: multipart/form-data
```

Gắn file ảnh một con vật hoặc meme và câu hỏi: `"Ảnh này là gì?"` hoặc để trống.

**Kết quả mong đợi:**
- AI nhận diện nội dung không thuộc phạm vi LMS/giáo dục/quản trị.
- AI từ chối súc tích và lịch sự, không phân tích chi tiết nhằm tiết kiệm token:
  > *"Hình ảnh/tài liệu này không thuộc phạm vi đào tạo hoặc quản trị của hệ thống AILMS. Vui lòng tải lên tài liệu học tập, bài tập, biểu đồ hoặc bảng số liệu liên quan đến hệ thống."*

---

## 23. Test định dạng khối Trích dẫn nguồn tham chiếu (Citations)

Mọi câu hỏi dựa trên tri thức RAG hoặc dữ liệu MySQL Tool Calling phải có khối trích dẫn ở cuối:

```http
POST {{baseUrl}}/api/v1/ai/chat/stream
Authorization: Bearer {{adminToken}}
Content-Type: application/json
Accept: text/event-stream

{
  "question": "Tìm nhân viên có mã EMP001 và cho biết hợp đồng còn hạn không?",
  "module": "HR",
  "route": "/admin/contracts"
}
```

**Kết quả mong đợi:**
Ở cuối câu trả lời của AI phải có khối trích dẫn rõ ràng:
```markdown
---
📌 **Nguồn tham chiếu:**
- [Dữ liệu Hệ thống]: Phân hệ Nhân sự & Hợp đồng, Mã NV: EMP001
```
