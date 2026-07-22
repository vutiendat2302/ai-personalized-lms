
## Phase 5 — AI Personalization

**Thời gian ước tính:** 2+ tuần (song song hoặc sau Phase 4)

**Điều kiện tiên quyết:** Phase 1–4 đã có dữ liệu thật từ người dùng.

### Input cho AI Service (Python)

- `LearningActivityLog` — hành vi học tập
- `LessonProgress` — bài đã học / chưa học
- Quiz scores, thời gian học, tần suất

### Backend (Spring Boot)

- [ ] Endpoint proxy: `GET /api/v1/students/me/recommendations`
- [ ] Endpoint: `GET /api/v1/students/me/learning-path`
- [ ] Retry / fallback khi AI service không available

**Deliverable Phase 5:** Gợi ý bài học tiếp theo, nhắc ôn tập, lộ trình cá nhân hóa.



