# Teacher/TA Workspace API

Base path: `/api/v1/teacher`. Tất cả endpoint yêu cầu JWT có một trong các authority
`ROLE_TEACHER`, `ROLE_TA`, `ROLE_ADMIN`; dữ liệu được giới hạn theo user trong JWT.

## Dashboard và lịch dạy

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/dashboard/metrics` | KPI lớp, buổi dạy tuần, hàng đợi chấm, risk, rating và thu nhập tháng |
| GET | `/dashboard/agenda` | Ca hôm nay và buổi kết thúc trong 24 giờ chưa nhận xét |
| GET | `/dashboard/activities` | Tối đa 5 hoạt động lớp học mới nhất, kèm `targetUrl` deep-link |
| GET | `/sessions/online?from=2026-08-10&to=2026-08-16` | Lịch tuần/tháng; tối đa 3 tháng |
| POST | `/sessions/{sessionId}/review` | Gửi nhận xét sau khi buổi học kết thúc |

KPI `sessionsThisWeekCompleted/sessionsThisWeekTotal` và Week View mặc định cùng dùng tuần hiện tại từ thứ Hai đến Chủ Nhật. Khi chuyển tuần/tháng, frontend gửi lại `from/to`; không dùng mốc ngày hard-code.

Payload nhận xét:

```json
{
  "note": "Học viên nắm được nội dung chính",
  "summary": "Ôn tập JWT và thực hành filter",
  "nextSessionNotes": "Bổ sung refresh token",
  "actualDurationMin": 90
}
```

## Chấm assignment, quiz và bài thi

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/grading/assignments` | Bài nộp assignment trạng thái chưa chấm |
| POST | `/grading/assignments/{submissionId}` | Chấm điểm và feedback assignment |
| GET | `/grading/quizzes/fill-blank` | Câu tự luận/điền từ đang chờ chấm |
| POST | `/grading/quizzes/fill-blank/{answerId}` | Chấm một câu; tự kết toán attempt khi đủ câu |
| GET | `/grading/quizzes/difficulty-stats` | Tỷ lệ sai theo câu hỏi |
| GET | `/assessments/authored?type=QUIZ|EXAM|ASSIGNMENT` | Assessment do chính user tạo |
| GET | `/quizzes/authored` | Alias lấy quiz và bài thi do chính user tạo |

Payload chấm assignment là `{"score": 8.5, "feedback": "Tốt"}`. Payload chấm câu quiz
là `{"points": 2, "correct": true}`; `correct` có thể bỏ qua và backend suy ra từ điểm.

Hiện database dùng chung entity `quiz` cho quiz và bài thi. API trả `type=EXAM` khi mã/tiêu đề
thể hiện `EXAM`, `FINAL` hoặc `BÀI THI`; các trường hợp còn lại là `QUIZ`.

## Yêu cầu, nghỉ phép và chuyển lớp

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/POST | `/requests` | Xem/tạo yêu cầu tổng quát gửi HR/Admin |
| POST | `/requests/class-transfer` | Xin chuyển phân công giữa hai lớp cùng khóa học |
| GET/POST | `/leave-requests` | Xem/tạo đơn nghỉ của employee trong JWT |

Payload chuyển lớp:

```json
{
  "fromClassId": "123456789012345678",
  "toClassId": "123456789012345679",
  "reason": "Trùng lịch giảng dạy"
}
```

Các ID Snowflake được serializer trả về dạng chuỗi JSON để frontend không mất độ chính xác.

Avatar người dùng được trả dưới dạng URL đọc qua backend `/api/v1/users/{userId}/avatar`.
Raw MinIO file key chỉ được lưu trong database và không được dùng trực tiếp làm `src` trên giao diện.

Role `SUPPORT` được phân loại là nhân viên như `HR`, dùng `EmployeeEntity` trên trang cài đặt
tài khoản. Khi tài khoản Support cũ chưa có hồ sơ nhân sự, backend tự khởi tạo mã nhân viên,
chức vụ hỗ trợ, loại hình toàn thời gian và trạng thái hoạt động khi tải hồ sơ lần đầu.

# Quản lý buổi học tại Class Detail

- `GET /api/v1/classes/{classId}/session-usage`: trả `totalSessions`, `reviewedSessions`, `scheduledSessions`, `remainingSessions`, `packageLimitConfigured` và `classStatus`. Chỉ buổi chính thức đã kết thúc và đã có nhận xét mới tăng `reviewedSessions`/giảm `remainingSessions`.
- `POST /api/v1/classes/{classId}/sessions`: đặt lịch bằng Teacher/TA trong JWT. Body gồm `title`, `scheduledAt`, `durationMin`, `meetingUrl`, `meetingProvider`. Sau khi tạo, hệ thống đăng announcement trên bảng tin và gửi notification tới học viên ACTIVE.
- `POST /api/v1/classes/{classId}/sessions/{sessionId}/cancel`: body `{ "reason": "..." }`. Lý do bắt buộc và thời điểm hủy phải trước giờ bắt đầu ít nhất 60 phút. Hệ thống lưu vết hủy, đăng bảng tin và gửi notification có deep-link.
- Khi nhận xét cuối cùng làm số buổi đã nhận xét đạt quota gói, lớp tự chuyển `COMPLETED`, đóng đăng ký và cập nhật `endDate`.
