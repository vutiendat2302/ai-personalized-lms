# Test Postman — AI tạo Quiz và Assignment từ Lesson Block

Tính năng này dùng đúng dữ liệu của Course Builder hiện tại: quiz giữ `questions` JSON trong `description` và Backend đồng bộ vào bảng `question`/`question_option`; assignment giữ JSON `instructions` và `submissionMode` trong `description`.

AI chỉ tạo draft. Không có quiz hay assignment nào được lưu cho đến khi người tạo khóa học xác nhận apply draft.

## Điều kiện

- Backend, AI Service, Redis, MySQL và Gemini đã chạy.
- Đăng nhập bằng Admin, Teacher tạo khóa học hoặc co-instructor đã được accept.
- Có `lessonId` thật của lesson cần tạo assessment. Nội dung block text nằm ở `lesson.description`.
- Tạo Postman variables: `baseUrl`, `teacherToken`, `lessonId`, `assessmentDraftId`.

## 1. Sinh Quiz từ block lesson

```http
POST {{baseUrl}}/api/v1/authoring/lessons/{{lessonId}}/ai-assessment-drafts
Authorization: Bearer {{teacherToken}}
Content-Type: multipart/form-data
```

Trong **Body → form-data**:

| Key | Type | Giá trị |
|---|---|---|
| `assessmentType` | Text | `QUIZ` |
| `questionCount` | Text | `5` |

Không cần truyền `materials` nếu block lesson đã có nội dung. Kết quả là `200 OK`, `data.quiz.questions` có các field `content`, `questionType`, `points`, `explanation`, `options`; `data.draftId` là ID dùng ở bước apply.

Trong tab **Tests**:

```javascript
pm.test("Có draft quiz", () => pm.response.to.have.status(200));
pm.environment.set("assessmentDraftId", pm.response.json().data.draftId);
```

## 2. Sinh Quiz + Assignment từ PDF/DOCX/ảnh

Dùng cùng endpoint, chọn **Body → form-data**:

| Key | Type | Giá trị |
|---|---|---|
| `assessmentType` | Text | `BOTH` |
| `questionCount` | Text | `8` |
| `materials` | File | PDF, DOCX, PNG hoặc JPEG |
| `materials` | File | Có thể thêm tối đa 2 file nữa |

Mỗi file tối đa 10 MB, tổng tối đa 3 file. PDF/DOCX được trích text, ảnh được Gemini Vision OCR/đọc bảng-hình rồi toàn bộ chỉ dùng trong request để sinh draft. File không được tự lưu MinIO, database hay Qdrant/RAG.

Kết quả mong đợi:

- `data.quiz` có quiz theo block hiện tại.
- `data.assignment.instructions` có đề bài, yêu cầu đầu ra và tiêu chí đánh giá.
- AI không được dùng kiến thức ngoài lesson/tài liệu đã cấp.

## 3. Review trước khi lưu

Kiểm tra thủ công title, đáp án đúng, explanation, assignment instructions. Draft chỉ sống 15 phút trong Redis và chưa xuất hiện khi gọi curriculum.

## 4. Apply draft vào Lesson

```http
POST {{baseUrl}}/api/v1/authoring/ai-assessment-drafts/{{assessmentDraftId}}/apply
Authorization: Bearer {{teacherToken}}
Content-Type: application/json

{
  "applyQuiz": true,
  "applyAssignment": true
}
```

Kết quả `201 Created`:

- `data.quiz` là Quiz thật liên kết `lessonId`, đã sync bảng câu hỏi và lựa chọn.
- `data.assignment` là Assignment thật liên kết `lessonId`.
- Draft bị xóa trước khi apply; gọi lại cùng `draftId` phải lỗi, tránh tạo trùng.

Chỉ muốn lưu quiz hoặc assignment thì để field còn lại là `false`.

## 5. Kiểm tra Course Builder

```http
GET {{baseUrl}}/api/v1/authoring/courses/{courseId}/curriculum
Authorization: Bearer {{teacherToken}}
```

Lesson vừa chọn có `linkedQuiz` / `linkedAssignment`. FE Course Builder đọc trực tiếp đúng block dữ liệu này, không cần format AI riêng.

## 6. Kiểm tra phân quyền và lỗi

| Trường hợp | Kết quả mong đợi |
|---|---|
| Teacher không phải owner/co-instructor accepted | `403`, không gửi content lesson sang AI Service |
| Student/HR | `403` do Authoring API chỉ cho Admin/Teacher |
| File PDF/DOCX/PNG/JPEG >10 MB | `400` |
| File khác XLSX, ZIP, WEBP | `400` |
| Hơn 3 file | `400` |
| Draft quá 15 phút hoặc apply lần hai | `400` |
| AI không trả JSON schema hợp lệ | AI Service trả lỗi, Backend không tạo draft hay assessment |
