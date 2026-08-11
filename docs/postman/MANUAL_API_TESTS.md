# Kiểm thử thủ công API bằng Postman

Tài liệu này dành cho việc gửi **từng request một** trong Postman. Không cần import collection và không cần nhập PayPal secret vào Postman.

Base URL local: `http://localhost/api`

Tất cả ID trong response nên được lưu dưới dạng text trong Postman Environment, ví dụ `courseId`, `packageId`, `orderId`, `requestId`. Không dùng số mũ hoặc làm tròn Snowflake ID.

## 0. Chuẩn bị

Tạo Environment `AILMS local` với các biến sau. Để trống các biến ID ban đầu.

| Biến | Giá trị |
| --- | --- |
| `baseUrl` | `http://localhost/api` |
| `studentToken` | để trống |
| `teacherToken` | để trống |
| `taToken` | để trống |
| `hrToken` | để trống |
| `courseId` | để trống |
| `packageId` | để trống |
| `orderId` | để trống |
| `requestId` | để trống |

Với dữ liệu seed local, đăng nhập bằng `student@ailms.com`, `teacher@ailms.com`, `ta@ailms.com`, hoặc `hr@ailms.com`; mật khẩu mặc định là `Password@123`. Nếu database của bạn không dùng seed, thay bằng tài khoản tương ứng đang có.

Ở mọi request cần xác thực, thêm header:

```http
Authorization: Bearer {{studentToken}}
```

Thay token bằng `teacherToken`, `taToken` hoặc `hrToken` theo role ở tiêu đề request.

## 1. Xác thực và dữ liệu khóa học

### 1.1 Đăng nhập học viên

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "student@ailms.com",
  "password": "Password@123"
}
```

Kỳ vọng `200`. Copy `data.accessToken` sang `studentToken`.

### 1.2 Tìm khóa công khai

```http
GET {{baseUrl}}/v1/courses/search?page=0&size=20
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200`. Chọn một `data.content[].id`, copy nguyên chuỗi sang `courseId`.

### 1.3 Chi tiết khóa học tổng hợp

```http
GET {{baseUrl}}/v1/courses/{{courseId}}/detail
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200`. Kiểm tra:

- `data.creator` là giảng viên biên soạn thật hoặc `null`; không có dữ liệu giả.
- `data.curriculum.sections[].lessons[]` có `id`, `title`, `orderIndex`, `duration`, `preview`, `accessible`, `locked`.
- `data.packages[]` có `deliveryMode`, `price`, `owned`, `purchasable`.
- Chọn một gói `SELF_STUDY` có `purchasable: true`; copy `id` sang `packageId`.

### 1.4 Chương trình học công khai

```http
GET {{baseUrl}}/v1/courses/{{courseId}}/curriculum
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200`. Ghi lại hai lesson ID: một lesson có `preview: true` và một lesson có `locked: true`.

### 1.5 Kiểm tra quyền preview

Request cho lesson preview:

```http
GET {{baseUrl}}/v1/learning/lessons/{{previewLessonId}}
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200` trước khi mua.

Request cho lesson khóa:

```http
GET {{baseUrl}}/v1/learning/lessons/{{lockedLessonId}}
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `403 Forbidden` trước khi mua. Nếu khóa không có lesson preview hoặc locked, bỏ qua case tương ứng; không tự tạo dữ liệu giả để test.

### 1.6 Không gian học tập

```http
GET {{baseUrl}}/v1/learning/courses/{{courseId}}
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200`. Toàn bộ curriculum vẫn xuất hiện, còn khả năng mở lesson phải đúng theo `accessible`/`locked`.

### 1.7 Chi tiết lớp của gói nhóm

Áp dụng cho package `GROUP_CLASS` hoặc `COMBO` có lớp nhóm lấy từ bước 1.3:

```http
GET {{baseUrl}}/v1/course-packages/{{groupClassPackageId}}/class-detail
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200` nếu gói gắn lớp hợp lệ. Kiểm tra `teacher`, `teachingAssistants`, `schedules`, `currentStudents`, `maxMembers`, `remainingSlots`, `registrationOpen` và `purchasable`.

## 2. Thanh toán PayPal Sandbox cho gói tự học

### 2.1 Tạo checkout

```http
POST {{baseUrl}}/v1/orders/checkout
Authorization: Bearer {{studentToken}}
Content-Type: application/json

{
  "coursePackageId": "{{packageId}}"
}
```

Kỳ vọng `201` với `data.orderId`, `data.paymentTransactionId`, `data.payUrl`. Lưu `data.orderId` vào `orderId`. Không gửi `userId`; backend lấy người dùng từ JWT.

Mở `data.payUrl` trong trình duyệt, đăng nhập **Personal Sandbox Account** của PayPal và bấm approve. Không dùng Business Sandbox Account để trả tiền.

### 2.2 Kiểm tra trạng thái trước approval/capture

```http
GET {{baseUrl}}/v1/orders/{{orderId}}/status
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200`, `data.orderStatus: PENDING`, `data.paymentStatus: PENDING`.

### 2.3 Test chặn capture khi chưa approval

Chỉ chạy case này **trước** khi mở PayPal approve:

```http
POST {{baseUrl}}/v1/payments/paypal/capture?orderId={{orderId}}
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `422` với thông báo thanh toán chưa được phê duyệt/chưa hoàn tất. Gọi request này không được tạo enrollment hay class member.

### 2.4 Tạo lại approval URL (chỉ khi cần)

```http
POST {{baseUrl}}/v1/payments/paypal/create?orderId={{orderId}}
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200` cùng `data.payUrl`. Dùng URL mới để quay lại bước approve. Không gọi sau khi order đã `PAID`.

### 2.5 Capture sau approval

Sau khi đã approve trong trình duyệt:

```http
POST {{baseUrl}}/v1/payments/paypal/capture?orderId={{orderId}}
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200`, `data.orderStatus: PAID`, `data.paymentStatus: SUCCESS`.

## 3. Checkout gói nhóm và 1-1

### 3.1 Gói `GROUP_CLASS`

Trước tiên chạy 1.7 và chỉ tiếp tục nếu `purchasable: true`, còn chỗ và lớp đang mở đăng ký.

```http
POST {{baseUrl}}/v1/orders/checkout
Authorization: Bearer {{studentToken}}
Content-Type: application/json

{
  "coursePackageId": "{{groupClassPackageId}}"
}
```

Sau PayPal approve, chạy capture ở 2.5 với order mới. Kỳ vọng đơn `PAID`, transaction `SUCCESS`, enrollment được tái sử dụng/tạo mới và học viên xuất hiện một lần trong class. Nếu lớp đầy, không mở đăng ký muộn, sai khóa học, hoặc inactive, checkout phải trả `422`.

### 3.2 Gói `ONE_ON_ONE`

Chọn `oneOnOnePackageId` từ `data.packages[]` có `deliveryMode: ONE_ON_ONE` và `purchasable: true`.

```http
POST {{baseUrl}}/v1/orders/checkout
Authorization: Bearer {{studentToken}}
Content-Type: application/json

{
  "coursePackageId": "{{oneOnOnePackageId}}",
  "oneOnOneNeeds": {
    "availablePeriod": "01/09/2026 - 30/09/2026",
    "availableDays": "Thứ 3, Thứ 5, Thứ 7",
    "preferredTimes": "19:00 - 21:00",
    "currentLevel": "Cơ bản",
    "learningSituation": "Đã học kiến thức nền nhưng chưa vững bài tập",
    "learningGoals": "Củng cố nền tảng và đạt điểm 8",
    "weakAreas": "Bài toán vận dụng",
    "instructorPreferences": "Ưu tiên dạy online buổi tối",
    "additionalNotes": "Không học được chủ nhật"
  }
}
```

Approve PayPal và capture như mục 2. Kỳ vọng sau capture mới tạo một matching request ở `WAITING_INSTRUCTOR`; không tạo lớp 1-1 chính thức ngay lúc thanh toán.

## 4. API học viên cho yêu cầu 1-1

### 4.1 Danh sách yêu cầu của học viên

```http
GET {{baseUrl}}/v1/students/one-on-one/requests
Authorization: Bearer {{studentToken}}
```

Kỳ vọng `200`. Lấy ID của request mới sang `requestId` sau khi capture gói 1-1.

### 4.2 Xác nhận sau buổi thử

Chỉ gọi khi request đang `TRIAL_COMPLETED`.

Đồng ý tiếp tục:

```http
POST {{baseUrl}}/v1/students/one-on-one/requests/{{requestId}}/trial-result
Authorization: Bearer {{studentToken}}
Content-Type: application/json

{ "continueLearning": true }
```

Kỳ vọng trạng thái `MATCHED`, lớp thử chuyển thành lớp chính thức.

Yêu cầu ghép lại:

```http
POST {{baseUrl}}/v1/students/one-on-one/requests/{{requestId}}/trial-result
Authorization: Bearer {{studentToken}}
Content-Type: application/json

{ "continueLearning": false }
```

Kỳ vọng `REMATCHING`; lớp thử đóng, không trừ số buổi đã mua, người dạy bị từ chối không nhận lại được cùng request.

## 5. API giáo viên/trợ giảng cho 1-1

### 5.1 Đăng nhập teacher hoặc TA

Gửi lại request 1.1 bằng `teacher@ailms.com` hoặc `ta@ailms.com`, lưu `data.accessToken` vào token role tương ứng.

### 5.2 Danh sách gợi ý

```http
GET {{baseUrl}}/v1/instructors/one-on-one/suggestions
Authorization: Bearer {{teacherToken}}
```

Kỳ vọng `200`. Response có nhu cầu học và số buổi đã mua, không có liên hệ riêng tư của học viên.

### 5.3 Nhận lớp

```http
POST {{baseUrl}}/v1/instructors/one-on-one/requests/{{requestId}}/accept
Authorization: Bearer {{teacherToken}}
```

Kỳ vọng `INSTRUCTOR_ACCEPTED`. Ngay sau đó thử cùng request bằng token TA/teacher khác: kỳ vọng `409` hoặc `422`, không thể có hai người nhận.

### 5.4 Tạo lớp và buổi thử

Chỉ HR đã mark contacted và request đang `CONTACTED`:

```http
POST {{baseUrl}}/v1/instructors/one-on-one/requests/{{requestId}}/trial-class
Authorization: Bearer {{teacherToken}}
Content-Type: application/json

{
  "className": "Học thử 1-1 Vật lý",
  "startAt": "2026-09-10T19:00:00",
  "endAt": "2026-09-10T20:00:00",
  "learningMode": "ONLINE",
  "linkOrLocation": "https://meet.google.com/example",
  "notes": "Chuẩn bị bài kiểm tra đầu vào"
}
```

Kỳ vọng `TRIAL_SCHEDULED`, một lớp `ONE_ON_ONE_TRIAL`, tối đa một học viên và một session `TRIAL`. Gọi lặp lại phải bị chặn.

### 5.5 Lấy buổi thử duy nhất

```http
POST {{baseUrl}}/v1/instructors/one-on-one/requests/{{requestId}}/trial-session
Authorization: Bearer {{teacherToken}}
```

Kỳ vọng trả buổi thử đã có, không sinh thêm session.

### 5.6 Gửi nhận xét sau buổi thử

Chỉ gọi sau khi buổi thử đã kết thúc:

```http
POST {{baseUrl}}/v1/instructors/one-on-one/requests/{{requestId}}/trial-review
Authorization: Bearer {{teacherToken}}
Content-Type: application/json

{
  "currentLevel": "Cơ bản khá",
  "weakAreas": "Bài tập vận dụng",
  "learningAttitude": "Tích cực",
  "recommendedPath": "Ôn nền tảng 2 buổi, sau đó luyện bài tập",
  "additionalNotes": "Nên giao bài về nhà sau mỗi buổi"
}
```

Kỳ vọng request chuyển `TRIAL_COMPLETED`, session là `COMPLETED` và học viên được thông báo để chọn kết quả.

## 6. API HR cho 1-1

### 6.1 Đăng nhập HR

Gửi request 1.1 bằng `hr@ailms.com`, lưu token vào `hrToken`.

### 6.2 Danh sách giám sát

```http
GET {{baseUrl}}/v1/hr/one-on-one/requests
Authorization: Bearer {{hrToken}}
```

Kỳ vọng `200`.

### 6.3 Đánh dấu đã kết nối liên hệ

Chỉ sau khi người dạy đã nhận request:

```http
POST {{baseUrl}}/v1/hr/one-on-one/requests/{{requestId}}/mark-contacted
Authorization: Bearer {{hrToken}}
```

Kỳ vọng `CONTACTED`. HR không tạo lớp thử hoặc phê duyệt lịch thử.

### 6.4 Hủy hoặc hoàn tiền khi cần can thiệp

Hủy:

```http
POST {{baseUrl}}/v1/hr/one-on-one/requests/{{requestId}}/cancel
Authorization: Bearer {{hrToken}}
Content-Type: application/json

{ "reason": "Học viên yêu cầu hủy" }
```

Hoàn tiền:

```http
POST {{baseUrl}}/v1/hr/one-on-one/requests/{{requestId}}/refund
Authorization: Bearer {{hrToken}}
Content-Type: application/json

{ "reason": "Không còn người dạy phù hợp" }
```

Hai request này làm thay đổi dữ liệu nghiệp vụ; chỉ dùng trên request test riêng.

## 7. Các lỗi phân quyền cần kiểm tra

Gửi các request instructor bằng `studentToken`, hoặc request HR bằng `teacherToken`: kỳ vọng `403`.

Gửi `GET /v1/orders/{{orderId}}/status` bằng học viên khác: kỳ vọng `403` hoặc `404`, tuyệt đối không trả dữ liệu đơn.

Gửi `POST /v1/payments/paypal/capture` với order chưa approve: kỳ vọng `422`, không phát sinh enrollment.

## 8. Lưu ý với PayPal Sandbox

- `PAYPAL_CLIENT_ID` và `PAYPAL_CLIENT_SECRET` chỉ tồn tại trên backend `.env`; không đưa vào header/body Postman.
- Chỉ redirect browser đến `payUrl` để approve. Redirect URL không tự cấp khóa học.
- API capture của backend mới là điểm đối soát và cấp quyền.
- Khi local chạy Docker cổng 80, redirect URL là `http://localhost/payment/result`.
- Một order PENDING có thể chặn mua trùng cùng gói. Hãy dùng order/package test khác hoặc để order hết hạn trước khi tạo lại.

## 9. Hoàn tiền thật qua PayPal Sandbox

Chỉ dùng order `PAID` có `paymentStatus: SUCCESS` và còn trong thời hạn chính sách. Đăng nhập HR hoặc Admin trước khi gọi API quản trị:

```http
POST {{baseUrl}}/v1/orders/{{orderId}}/refund
Authorization: Bearer {{hrToken}}
Content-Type: application/json

{
  "reason": "Học viên yêu cầu hủy gói trong thời hạn hoàn tiền"
}
```

Kỳ vọng `200`, `data.status: REFUNDED`. Backend gọi PayPal Refund bằng capture ID đã lưu; tiền Sandbox quay lại PayPal balance/thẻ Sandbox ban đầu, không cần tài khoản ngân hàng.

Kiểm tra transaction bằng HR/Admin:

```http
GET {{baseUrl}}/v1/payments/order/{{orderId}}
Authorization: Bearer {{hrToken}}
```

Kỳ vọng transaction có `status: REFUNDED`, `paypalRefundId`, `refundAmount`, `refundCurrency`, `refundReason`, `refundedAt`. Gọi lại request refund phải không tạo refund thứ hai. Với gói nhóm, học viên phải bị gỡ khỏi lớp; với gói 1-1, matching và lớp liên quan phải chuyển sang `CANCELLED`.

Nếu order dùng voucher, PayPal chỉ hoàn `finalAmount` thực trả. Sau refund thành công, gọi `GET /v1/student/vouchers`: voucher phải về `AVAILABLE` nếu còn hạn và `coupon.usedCount` giảm đúng một lần.

## 10. Voucher, checkout giỏ hàng và hóa đơn

### 10.1 Cấp voucher cho học viên

```http
POST {{baseUrl}}/v1/coupons/{{couponId}}/users/{{studentUserId}}
Authorization: Bearer {{hrToken}}
```

Kỳ vọng `201`. Cấp lại cùng coupon cho cùng học viên phải bị từ chối.

### 10.2 Lấy ví voucher

```http
GET {{baseUrl}}/v1/student/vouchers
Authorization: Bearer {{studentToken}}
```

Chỉ trả voucher đã cấp cho tài khoản JWT, kèm `AVAILABLE/RESERVED/USED/EXPIRED`, `usable` và lý do không khả dụng.

### 10.3 Checkout nhiều gói từ giỏ với voucher

```http
POST {{baseUrl}}/v1/orders/checkout
Authorization: Bearer {{studentToken}}
Content-Type: application/json

{
  "items": [
    { "coursePackageId": "{{packageId}}", "itemType": "NEW_PURCHASE" },
    { "coursePackageId": "{{secondPackageId}}", "itemType": "NEW_PURCHASE" }
  ],
  "couponCode": "WELCOME100K",
  "acceptScheduleConflict": false
}
```

Kỳ vọng order lưu `totalAmount`, `discountAmount`, `finalAmount`, và mỗi item có `discountSnapshot`, `finalPrice`. Nếu lịch GROUP_CLASS/COMBO trùng, backend trả lỗi kèm hướng dẫn gửi `acceptScheduleConflict: true`; frontend phải hỏi xác nhận trước khi gọi lại.

### 10.4 Xem chi tiết và tải hóa đơn học viên

```http
GET {{baseUrl}}/v1/student/orders/{{orderId}}
Authorization: Bearer {{studentToken}}
```

```http
GET {{baseUrl}}/v1/student/orders/{{orderId}}/invoice.pdf
Authorization: Bearer {{studentToken}}
```

API PDF chỉ cho chủ đơn và chỉ nhận order `PAID` hoặc `REFUNDED`.

### 10.5 Tải hóa đơn cho quản lý

```http
GET {{baseUrl}}/v1/orders/{{orderId}}/invoice.pdf
Authorization: Bearer {{hrToken}}
```

Kỳ vọng response `Content-Type: application/pdf` và tên file `AILMS-invoice-{orderId}.pdf`.

## 11. Bài tập lớp, quiz và lịch cá nhân

Người dạy/trợ giảng của đúng lớp giao bài:

```http
POST {{baseUrl}}/v1/classes/{{classId}}/assignments
Authorization: Bearer {{teacherToken}}
Content-Type: application/json

{
  "title": "Bài tập tuần 1",
  "description": "Nộp lời giải và file đính kèm",
  "maxScore": 10,
  "dueDate": "2026-08-20T22:00:00",
  "allowLate": false,
  "status": "ACTIVE"
}
```

Giao quiz/lịch thi:

```http
POST {{baseUrl}}/v1/classes/{{classId}}/quizzes
Authorization: Bearer {{teacherToken}}
Content-Type: application/json

{
  "title": "Quiz giữa kỳ",
  "timeLimitMin": 30,
  "passScore": 5,
  "maxAttempts": 1,
  "shuffleQuestions": true,
  "dueAt": "2026-08-22T20:00:00",
  "status": 1
}
```

Học viên kiểm tra dữ liệu của chính mình:

```http
GET {{baseUrl}}/v1/student/assignments
GET {{baseUrl}}/v1/student/quizzes
GET {{baseUrl}}/v1/student/schedule
Authorization: Bearer {{studentToken}}
```

`schedule` hợp nhất `ONLINE_CLASS`, `ASSIGNMENT_DEADLINE`, `QUIZ_DEADLINE` và không trả lịch của lớp khác.
