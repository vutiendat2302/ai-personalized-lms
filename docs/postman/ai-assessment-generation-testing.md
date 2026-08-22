# Test Postman — AI tạo và phát hành Quiz từ Lesson, RAG lớp và file upload

Quiz được lưu bằng quan hệ thật `quiz -> question -> question_option`. Tài liệu đã có trong lớp được ingest một lần vào Qdrant; request generate chỉ gửi `ragSourceIds` và scope, không gửi lại toàn bộ file. File upload bổ sung được xử lý in-memory.

AI chỉ tạo draft. Không có quiz hay assignment nào được lưu cho đến khi người tạo khóa học xác nhận apply draft.

## Điều kiện

- Backend, AI Service, Redis, MySQL và Gemini đã chạy.
- Đăng nhập bằng Admin, Teacher tạo khóa học hoặc co-instructor đã được accept.
- Có `lessonId` thật của lesson cần tạo assessment. Nội dung block text nằm ở `lesson.description`.
- Tạo Postman variables: `baseUrl`, `teacherToken`, `studentToken`, `lessonId`, `classId`, `resourceId`, `assessmentDraftId`, `sourceQuizId`, `classQuizId`, `attemptId`.

## 0. Lấy tài liệu lớp có thể dùng cho AI

```http
GET {{baseUrl}}/api/v1/authoring/lessons/{{lessonId}}/ai-assessment-materials?classId={{classId}}
Authorization: Bearer {{teacherToken}}
```

Chỉ item `ragStatus=READY` và `canUseForAi=true` được chọn. Lưu một ID:

```javascript
const ready = pm.response.json().data.find(item => item.canUseForAi);
pm.expect(ready, "Cần ít nhất một tài liệu READY").to.exist;
pm.environment.set("resourceId", ready.id);
```

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
| `classId` | Text | `{{classId}}` |
| `resourceIds` | Text | `{{resourceId}}` |

Có thể bỏ `classId/resourceIds` nếu chỉ dùng block lesson. Có thể thêm nhiều `resourceIds` bằng các dòng form-data trùng key, tối đa 10 source không trùng. Kết quả là `200 OK`, `data.quiz.questions` có `sourceIds`, còn `data.sources` là nguồn audit của draft.

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

## 3. Review/chỉnh sửa trước khi lưu

Kiểm tra thủ công title, đáp án đúng, explanation và nguồn. Frontend cho phép sửa title/question/options/correct answer. Draft chỉ sống 15 phút trong Redis và chưa xuất hiện khi gọi curriculum.

## 4. Apply draft vào Lesson

```http
POST {{baseUrl}}/api/v1/authoring/ai-assessment-drafts/{{assessmentDraftId}}/apply
Authorization: Bearer {{teacherToken}}
Content-Type: application/json

{
  "applyQuiz": true,
  "applyAssignment": false,
  "quiz": {
    "title": "Quiz chương 1 đã review",
    "questions": [
      {
        "content": "Câu hỏi đã chỉnh sửa?",
        "questionType": "SINGLE_CHOICE",
        "points": 1,
        "explanation": "Giải thích sau review",
        "options": [
          {"content": "Đúng", "isCorrect": true},
          {"content": "Sai", "isCorrect": false}
        ]
      }
    ]
  }
}
```

Kết quả `201 Created`:

- `data.quiz` là Quiz thật liên kết `lessonId`, đã sync bảng câu hỏi và lựa chọn.
- `data.assignment` là Assignment thật liên kết `lessonId`.
- Draft được validate ownership/nội dung rồi claim một lần; gọi lại cùng `draftId` phải lỗi, tránh tạo trùng.

Chỉ muốn lưu quiz hoặc assignment thì để field còn lại là `false`.

Trong tab Tests của request apply:

```javascript
pm.environment.set("sourceQuizId", pm.response.json().data.quiz.id);
```

## 5. Kiểm tra Course Builder

```http
GET {{baseUrl}}/api/v1/authoring/courses/{courseId}/curriculum
Authorization: Bearer {{teacherToken}}
```

Lesson vừa chọn có `linkedQuiz` / `linkedAssignment`. FE Course Builder đọc trực tiếp đúng block dữ liệu này, không cần format AI riêng.

## 6. Phát hành Quiz vào lớp

```http
POST {{baseUrl}}/api/v1/teacher/classes/{{classId}}/quizzes/{{sourceQuizId}}/publish
Authorization: Bearer {{teacherToken}}
Content-Type: application/json

{
  "availableFrom": "2026-08-20T13:00:00",
  "dueAt": "2026-08-27T23:59:00",
  "maxAttempts": 3,
  "showResultAfterSubmit": false
}
```

Response `201`; lưu Quiz lớp:

```javascript
pm.environment.set("classQuizId", pm.response.json().data.id);
```

## 7. Học viên đọc và làm Quiz lớp

```http
GET {{baseUrl}}/api/v1/student/quizzes/{{classQuizId}}
Authorization: Bearer {{studentToken}}
```

Mọi `questions[].options[].isCorrect` và `questions[].explanation` phải là `null`.

```http
POST {{baseUrl}}/api/v1/student/quizzes/{{classQuizId}}/attempts
Authorization: Bearer {{studentToken}}
```

Lưu `attemptId`, sau đó submit:

```http
POST {{baseUrl}}/api/v1/student/quiz-attempts/{{attemptId}}/submit
Authorization: Bearer {{studentToken}}
Content-Type: application/json

{
  "answers": [
    {"questionId": "<question-id>", "selectedOptionId": "<option-id>"}
  ]
}
```

Với `showResultAfterSubmit=false`, `GET /api/v1/student/quizzes` không được trả `bestScore` hoặc `passed` cho Quiz này.

## 8. Kiểm tra phân quyền và lỗi

| Trường hợp | Kết quả mong đợi |
|---|---|
| Teacher không phải owner/co-instructor accepted | `403`, không gửi content lesson sang AI Service |
| Student/HR | `403` do Authoring API chỉ cho Admin/Teacher |
| File PDF/DOCX/PNG/JPEG >10 MB | `400` |
| File khác XLSX, ZIP, WEBP | `400` |
| Hơn 3 file | `400` |
| Draft quá 15 phút hoặc apply lần hai | `400` |
| AI không trả JSON schema hợp lệ | AI Service trả lỗi, Backend không tạo draft hay assessment |
| Resource không thuộc `classId` | `403` |
| Resource chưa `READY`, ID trùng hoặc quá 10 | `400` |
| RAG source không có chunk | Không tạo draft; không fallback kiến thức ngoài nguồn |
| Người khác apply draft | `403`, draft không bị mất |
| Edited Quiz không có đúng đáp án | `400`, draft vẫn còn |
| Publish Quiz khác course hoặc publish trùng ACTIVE | `400` |
| Student không thuộc lớp | Không list/read/start được Quiz |
| Chưa tới `availableFrom` hoặc qua `dueAt` | Không đọc câu hỏi/start/submit được |
