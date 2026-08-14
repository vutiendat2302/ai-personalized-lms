# Public Landing API – Postman

Base URL: `http://localhost:8080/api/v1`

Các request dưới đây không gửi `Authorization`. Dữ liệu trả về chỉ gồm danh mục ACTIVE, khóa học ACTIVE có ít nhất một package ACTIVE và giáo viên có tài khoản ACTIVE. Loại package không phải điều kiện lọc; vì vậy khóa học có package 1-1 hoặc group vẫn được hiển thị.

## Catalog

```http
GET {{baseUrl}}/public/teachers?page=0&size=12&keyword=java
GET {{baseUrl}}/public/teachers/{teacherId}
GET {{baseUrl}}/public/teachers/{teacherId}/courses?page=0&size=12&level=BEGINNER&categoryId={categoryId}
GET {{baseUrl}}/public/categories/course-counts
GET {{baseUrl}}/public/categories/hot?page=0&size=10
GET {{baseUrl}}/public/categories/{categoryId}/popular-courses?page=0&size=12&level=BEGINNER
GET {{baseUrl}}/public/categories/{categoryId}/courses?page=0&size=12&level=ADVANCED
GET {{baseUrl}}/public/categories/{categoryId}/related-categories?limit=6
GET {{baseUrl}}/public/categories/{categoryId}/related-courses?page=0&size=12
GET {{baseUrl}}/public/courses/{courseId}/related-categories?limit=6
GET {{baseUrl}}/public/courses/{courseId}/related-courses?page=0&size=12
```

Hai endpoint related dùng semantic similarity từ collection Qdrant riêng cho catalog:

- `public_catalog_category`: vector tạo từ tên và mô tả danh mục.
- `public_catalog_course`: vector tạo từ tên, danh mục, mô tả, mục tiêu, điều kiện đầu vào và level khóa học.
- Backend vẫn lọc lại bằng MySQL để chỉ trả category ACTIVE có khóa học công khai và course ACTIVE có ít nhất một package ACTIVE.
- Nếu AI Service/Qdrant tạm thời unavailable, API dùng fallback quan hệ giáo viên chung hiện có cho khóa học và quan hệ category hiện có cho danh mục.
- Vector được upsert khi category/course tạo hoặc cập nhật, xóa khi xóa mềm, và đồng bộ lại khi Backend khởi động.

`level` nhận giá trị enum hiện có: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `ALL_LEVELS`.

## Guest AI Chat SSE

```http
POST {{baseUrl}}/public/ai/chat/stream
Accept: text/event-stream
Content-Type: application/json

{
  "question": "Tôi muốn học Java từ cơ bản, nên chọn khóa nào?",
  "conversationId": "guest_xxx"
}
```

Response trả header `X-Conversation-Id` và các event SSE từ Backend/AI Service. Backend truy vấn catalog thật trước khi gọi AI; AI không được phép tự tạo tên, giá hoặc link. Không có dữ liệu phù hợp thì AI phải nói rõ chưa có dữ liệu.

## Tiêu chí dữ liệu

- Khóa học phổ biến: `enrollmentCount DESC`, `avgRating DESC`, `reviewCount DESC`, `createdAt DESC`.
- Danh mục nổi bật: số khóa học công khai giảm dần, sau đó tổng `enrollmentCount` giảm dần.
- Danh mục liên quan: danh mục khác được giáo viên ACTIVE của danh mục hiện tại cùng giảng dạy; không hard-code tên danh mục.
- Khóa học liên quan: khóa học công khai khác danh mục nhưng có giáo viên ACTIVE chung.
- Khóa học liên quan theo `courseId`: dùng vector catalog, loại chính khóa học và loại toàn bộ khóa học thuộc cùng danh mục; kết quả chỉ còn khóa học ACTIVE có package ACTIVE.
- `slug` hiện được tạo ổn định từ tên vì schema category chưa có cột slug; icon/biography chưa có nguồn dữ liệu thì trả `null`, không mock.

## Header search

Header tiếp tục gọi `GET /search/suggestions?keyword=...`. Backend ưu tiên index Meilisearch `courses`, chỉ trả khóa học ACTIVE có package ACTIVE, và fallback MySQL nếu Meilisearch unavailable. Cấu hình: `MEILISEARCH_URL`, `MEILISEARCH_API_KEY`, `MEILISEARCH_ENABLED`. `COMBO` không còn được đưa vào `deliveryModes` của card landing; package COMBO không bị xóa khỏi database hay các luồng checkout hiện có.
