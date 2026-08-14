# Postman – Guided Chat và Support consultant

Base URL: `http://localhost:8080/api/v1`

Widget tạo hoặc khôi phục visitor session khi mở. Mọi quick reply gửi `optionId` về Backend và được lưu vào conversation. Các nhánh lộ trình, học phí, hình thức học, giảng viên và policy gọi AI Service qua Backend bằng context catalog/policy thật; Frontend không gọi AI Service trực tiếp.

## 1. Lấy option và gợi ý khóa học

```http
GET {{baseUrl}}/public/support/options
```

Sau khi frontend có `categoryId`, `level` và `goal`, Backend gọi AI catalog vector rồi trả khóa học public thật:

```http
POST {{baseUrl}}/public/support/recommendations
Content-Type: application/json

{"categoryId":363193355758342144,"level":"BEGINNER","goal":"CAREER","limit":6}
```

## 2. Tạo visitor và conversation khi kết nối Support

```http
POST {{baseUrl}}/public/support/visitors
```

Lưu `data.visitorToken` thành `visitorToken` và `data.conversationId` thành `conversationId`.
Không dùng `data.visitorId` thay cho `conversationId`. Có thể gọi endpoint sau để khôi phục conversation đang mở:

```http
GET {{baseUrl}}/public/support/conversations/current
X-Visitor-Token: {{visitorToken}}
```

Lưu `data.id` thành `conversationId`. Reload gọi lại endpoint này sẽ trả cùng conversation đang mở.

Tạo conversation mới và kết thúc phiên mở hiện tại:

```http
POST {{baseUrl}}/public/support/conversations/new
X-Visitor-Token: {{visitorToken}}
```

Các quick AI hợp lệ: `LEARNING_PATH`, `PRICING`, `DELIVERY`, `TEACHERS`, `POLICY`. Tìm khóa học dùng chuỗi option `COURSE_CONSULTING → CATEGORY_{id} → LEVEL_* → GOAL_*` và trả `COURSE_RESULTS` chứa card khóa học thật.

## 3. Gửi contact để đưa vào queue

```http
POST {{baseUrl}}/public/support/conversations/{{conversationId}}/contact
X-Visitor-Token: {{visitorToken}}
Content-Type: application/json

{
  "fullName":"Nguyễn Văn A",
  "phone":"0901234567",
  "email":"a@example.com",
  "note":"Tôi cần tư vấn lộ trình Java"
}
```

Số điện thoại bắt buộc theo mẫu Việt Nam. `estimatedWaitMinutes` được tính theo vị trí queue và số supporter còn heartbeat, tối thiểu 5 phút.

## 4. Đọc message và lịch sử

```http
GET {{baseUrl}}/public/support/conversations/{{conversationId}}/messages?page=0&size=100
X-Visitor-Token: {{visitorToken}}
```

Visitor có thể hủy ticket khi đang `QUEUED` hoặc `ASSIGNED`; hệ thống rút ticket khỏi hàng đợi, giải phóng supporter đã được gán và chuyển sang `CANCELLED`:

```http
POST {{baseUrl}}/public/support/conversations/{{conversationId}}/cancel
X-Visitor-Token: {{visitorToken}}
```

Ticket `ACTIVE` không thể hủy bằng thao tác này. Khi tư vấn viên yêu cầu đóng và trạng thái là `WAITING_CONFIRMATION`, visitor đồng ý bằng:

```http
POST {{baseUrl}}/public/support/conversations/{{conversationId}}/close
X-Visitor-Token: {{visitorToken}}
```

Visitor muốn tiếp tục thì gửi quick reply `KEEP_ACTIVE`:

```http
POST {{baseUrl}}/public/support/conversations/{{conversationId}}/quick-replies
X-Visitor-Token: {{visitorToken}}
Content-Type: application/json

{"optionId":"KEEP_ACTIVE"}
```

```http
GET {{baseUrl}}/public/support/conversations/history?page=0&size=20
X-Visitor-Token: {{visitorToken}}
```

Tin nhắn tự do visitor chỉ được phép sau khi HR chuyển conversation sang `ACTIVE`:

```http
POST {{baseUrl}}/public/support/conversations/{{conversationId}}/messages
X-Visitor-Token: {{visitorToken}}
Content-Type: application/json

{"content":"Tôi muốn hỏi thêm về thời lượng khóa học."}
```

Upload ảnh/tài liệu chỉ khi `ACTIVE`; hỗ trợ JPG, PNG, WEBP, GIF, PDF, DOCX, XLSX, TXT, tối đa 10MB:

```http
POST {{baseUrl}}/public/support/conversations/{{conversationId}}/attachments
X-Visitor-Token: {{visitorToken}}
Content-Type: multipart/form-data

file=@/path/to/file.pdf
```

## 5. Luồng Support consultant

Tất cả request cần JWT tài khoản có `ROLE_SUPPORT`. Tài khoản seed local: `support123 / Password@123`.

```http
POST {{baseUrl}}/support/presence
Authorization: Bearer {{hrAccessToken}}
Content-Type: application/json

{"status":"ONLINE_AVAILABLE"}
```

```http
GET {{baseUrl}}/support/queue
Authorization: Bearer {{hrAccessToken}}
GET {{baseUrl}}/support/conversations
Authorization: Bearer {{hrAccessToken}}
```

Mọi supporter đều thấy conversation `QUEUED` trong hàng đợi chung. Supporter chủ động claim ticket:

```http
POST {{baseUrl}}/support/conversations/{{conversationId}}/accept
Authorization: Bearer {{hrAccessToken}}
```

```http
POST {{baseUrl}}/support/conversations/{{conversationId}}/messages
Authorization: Bearer {{hrAccessToken}}
Content-Type: application/json

{"content":"Chào bạn, mình có thể hỗ trợ gì thêm?"}
```

Support upload file hoặc tìm/gửi card catalog:

```http
POST {{baseUrl}}/support/conversations/{{conversationId}}/attachments
Authorization: Bearer {{hrAccessToken}}
Content-Type: multipart/form-data

file=@/path/to/image.png

GET {{baseUrl}}/support/resources?query=java&limit=12
Authorization: Bearer {{hrAccessToken}}

POST {{baseUrl}}/support/conversations/{{conversationId}}/resources
Authorization: Bearer {{hrAccessToken}}
Content-Type: application/json

{"resourceType":"COURSE","resourceId":"346207687844827136"}
```

`resourceType` nhận `COURSE`, `CATEGORY`, `PACKAGE`. Backend kiểm tra resource còn public rồi mới tạo `RESOURCE_CARD`; AI không tự tạo ID hoặc URL.

Supporter chỉ được yêu cầu đóng sau khi tin gần nhất đã chờ visitor phản hồi đủ 5 phút:

```http
POST {{baseUrl}}/support/conversations/{{conversationId}}/request-close
Authorization: Bearer {{hrAccessToken}}

```

Endpoint supporter `close` không cho đóng trực tiếp. Nếu visitor vẫn không phản hồi, job tự đóng phiên sau 20 phút tính từ nội dung supporter gần nhất.

## State machine và queue

`GUIDED → COLLECTING_CONTACT → QUEUED → ACTIVE → WAITING_CONFIRMATION → CLOSED`.

`ASSIGNED` chỉ còn được chấp nhận để tương thích với ticket cũ đã tạo trước khi đổi workflow.

Visitor chỉ có một conversation ở các trạng thái mở. Frontend Support gửi heartbeat mỗi 30 giây; Backend tự suy ra `ONLINE_AVAILABLE` khi không có workload, `ONLINE_BUSY` khi có `ACTIVE/WAITING_CONFIRMATION`, và job chuyển sang `OFFLINE` sau 90 giây mất heartbeat. Supporter không chọn presence thủ công.

Backend không tự phân phối. Endpoint `accept` khóa cả presence của supporter và conversation bằng pessimistic lock, vì vậy một ticket chỉ có thể được một người claim và mỗi supporter chỉ có tối đa một phiên `ACTIVE/WAITING_CONFIRMATION`. Khi supporter offline hoặc hết heartbeat, phiên đang mở được trả về queue chung. Queue FIFO tính theo `createdAt`; `estimatedWaitMinutes` được ước tính theo vị trí queue, trung bình 5 phút/lượt và số supporter còn heartbeat. Frontend visitor hiển thị cảnh báo quá tải khi thời gian đã chờ vượt mức dự kiến.

Mỗi tin text, attachment hoặc resource của supporter bắt đầu đồng hồ chờ phản hồi mới. Visitor trả lời sẽ hủy đồng hồ cũ. API conversation trả `requestCloseAvailableAtEpochMs` và `autoCloseAtEpochMs` để cả hai frontend hiển thị countdown đồng bộ, không phụ thuộc timezone. Conversation đã `CLOSED` vẫn xuất hiện trong tab lịch sử của supporter đã phụ trách nhưng không tính vào giới hạn một phiên active.

Realtime dùng STOMP tại `/ws/support`; SUPPORT xác thực bằng JWT, visitor xác thực bằng `X-Visitor-Token` trong CONNECT frame. Client chỉ được subscribe/send vào conversation đã được gán hoặc thuộc visitor đó.
