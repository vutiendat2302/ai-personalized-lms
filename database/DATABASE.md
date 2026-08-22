# Database Design 

## Database Diagram
```
https://dbdiagram.io/d/ai-personalized-6a41e4ebb3ebc94a7daf0252
```

## ID Generation Strategy

### 1. Snowflake ID
Dùng cho bảng sinh dữ liệu liên tục: `user`, `course`, `lesson`, `enrollment`, `class`, `class_online`, `quiz_attempt`, `submission`, `lesson_progress`, `learning_activity_log`, `attendance`, `salary`, `audit_log`...

### 2. Auto Increment / UUID / ULID
Dùng cho bảng nhỏ, tương đối tĩnh: `role`, `permission`, `department`, `category`, `guardian`

### 3. Junction Tables (Many-to-Many)
Không có cột `id` riêng, dùng composite primary key. Ví dụ: `user_role`, `role_permission`, `course_teacher`, `class_member`.

---

## Module Overview

| Module | Name |
|---|---|
| 1 | User & Authorization |
| 2 | Course Management |
| 3 | Class Management |
| 4 | HR Management |
| 5 | Student Management |
| 6 | Learning Progress & Tracking |
| 7 | Assessment |
| 8 | Audit & System Log |
| 9 | AI Recommendation (To Do) |

---

# Module 1. User & Authorization

## Tables
* user
* department
* role
* permission
* user_role
* role_permission

## user

| Column | Type | Description |
|---|---|---|
| id | BIGINT | User ID (PK) |
| username | VARCHAR | Tên đăng nhập (unique) |
| email | VARCHAR | Email (unique) |
| password_hash | VARCHAR | Mật khẩu đã hash |
| full_name | VARCHAR | Họ tên đầy đủ |
| phone | VARCHAR | Số điện thoại |
| avatar_url | VARCHAR | Ảnh đại diện |
| gender | TINYINT | Male / Female / Other |
| date_of_birth | DATE | Ngày sinh |
| attributes | JSON | Thuộc tính ABAC |
| status | TINYINT | Active / Inactive / Banned / Pending |
| last_login_at | DATETIME | Lần đăng nhập gần nhất |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## department

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Department ID (PK) |
| parent_id | BIGINT | FK → department.id |
| code | VARCHAR | Mã phòng ban (unique) |
| name | VARCHAR | Tên phòng ban |
| description | TEXT | Mô tả |
| status | TINYINT | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## role

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Role ID (PK) |
| code | VARCHAR | Mã role, unique |
| name | VARCHAR | Tên hiển thị |
| description | TEXT | Mô tả |
| status | TINYINT | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## permission

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Permission ID (PK) |
| code | VARCHAR | Mã permission, unique — vd: `course:create` |
| entity | VARCHAR | Thuộc về module nào |
| name | VARCHAR | Tên hiển thị |
| description | TEXT | Mô tả |
| status | TINYINT | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## user_role

```sql
PRIMARY KEY (user_id, role_id)
```

| Column | Type | Description |
|---|---|---|
| user_id | BIGINT | FK → user.id |
| role_id | BIGINT | FK → role.id |
| assigned_at | DATETIME | Thời điểm được gán role |
| assigned_by | BIGINT | Id người gán |
| expired_at | DATETIME | Thời điểm role hết hiệu lực |

## role_permission

```sql
PRIMARY KEY (role_id, permission_id)
```

| Column | Type | Description |
|---|---|---|
| role_id | BIGINT | FK → role.id |
| permission_id | BIGINT | FK → permission.id |
| granted_at | DATETIME | Thời điểm cấp quyền cho role |
| granted_by | BIGINT | Id người cấp quyền |

---

# Module 2. Course Management

## Tables
* category
* course
* course_section
* lesson
* lesson_resource
* course_teacher

## category

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Category ID |
| name | VARCHAR(100) | Category name |
| description | TEXT | Description |
| status | BOOLEAN | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## course

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Course ID |
| category_id | BIGINT | FK → category.id |
| name | VARCHAR(100) | Course name |
| link | VARCHAR | URL-friendly identifier (unique) |
| description | TEXT | Course description |
| level | VARCHAR | Beginner / Intermediate / Advanced |
| status | TINYINT | Draft / Published / Archived |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## course_section

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Section ID |
| course_id | BIGINT | FK → course.id |
| name | VARCHAR(100) | Section title |
| order_index | INT | Display order |
| status | BOOLEAN | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## lesson

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Lesson ID |
| section_id | BIGINT | FK → course_section.id |
| name | VARCHAR | Lesson title |
| content_type | VARCHAR | VIDEO / PDF / TEXT / LIVE |
| content_url | VARCHAR | Content URL |
| description | TEXT | Description |
| duration_min | INT | Estimated learning duration (minutes) |
| duration_sec | INT | Actual VIDEO/AUDIO media duration (seconds) |
| is_preview | BOOLEAN | Preview lesson |
| order_index | INT | Display order |
| status | TINYINT | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## lesson_resource

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Resource ID |
| lesson_id | BIGINT | FK → lesson.id |
| name | VARCHAR | Resource name |
| file_url | VARCHAR | File URL |
| file_type | VARCHAR | PDF / ZIP / DOCX / PPTX |
| file_size | BIGINT | File size (bytes) |
| status | TINYINT | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## course_teacher

> Giáo viên quản lý course đấy

```sql
PRIMARY KEY (course_id, user_id)
```

| Column | Type | Description |
|---|---|---|
| course_id | BIGINT | FK → course.id |
| user_id | BIGINT | FK → user.id |
| assigned_at | DATETIME | Assigned time |
| assigned_by | BIGINT | Assigned by |
| status | VARCHAR(50) | PENDING / ACTIVE / REJECTED / INACTIVE |

---

# Module 3. Class Management

## Tables
* class
* enrollment
* class_online
* class_member

## class

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Class ID |
| course_id | BIGINT | FK → course.id |
| name | VARCHAR | Tên lớp |
| type | TINYINT | Loại lớp |
| max_members | INT | Giới hạn học viên |
| status | TINYINT | Status |
| start_date | DATETIME | Ngày bắt đầu |
| end_date | DATETIME | Ngày kết thúc |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## enrollment

> Quản lý học viên, trợ giảng tham gia khóa học, lớp học 1-1

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Enrollment ID |
| user_id | BIGINT | FK → user.id |
| course_id | BIGINT | FK → course.id |
| class_id | BIGINT | FK → class.id (nullable) |
| status | TINYINT | Status |
| enrolled_at | DATETIME | Thời điểm enroll |
| completed_at | DATETIME | Thời điểm hoàn thành |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## class_online

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Session ID |
| class_id | BIGINT | FK → class.id |
| teacher_id | BIGINT | Giáo viên dạy buổi này |
| title | VARCHAR | Tên buổi học |
| meeting_url | VARCHAR | Link Zoom/Meet |
| scheduled_at | DATETIME | Thời gian bắt đầu |
| duration_min | INT | Thời lượng (phút) |
| status | TINYINT | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## course_member

> Kiểm soát số lượng hvien theo khóa học, sau chia ra thành khóa có gia sư 1/1 và khóa tự học

```sql
PRIMARY KEY (course_id, user_id)
```

| Column | Type | Description |
|---|---|---|
| course_id | BIGINT | FK → course.id |
| user_id | BIGINT | FK → user.id |
| role_in_class | TINYINT | TEACHER / STUDENT / TA |
| joined_at | DATETIME | Thời điểm tham gia |
| left_at | DATETIME | Thời điểm rời lớp |

---

# Module 4. HR Management (Nhân sự)

## Tables
* employee
* employee_contract
* attendance
* teaching_rate
* teaching_session_payment
* salary

## employee

| Column | Type | Description |
|---|---|---|
| user_id | BIGINT | PK, FK → user.id |
| employee_code | VARCHAR | Mã nhân viên (unique) |
| department_id | BIGINT | FK → department.id |
| position | VARCHAR | Vị trí công việc — Teacher, HR, Accountant, Manager, Director, Trợ giảng |
| employment_type | TINYINT | FULL_TIME / PART_TIME — Hình thức làm việc |
| start_date | DATETIME | Ngày bắt đầu làm việc |
| end_date | DATETIME | Ngày kết thúc, chấm dứt hợp đồng |
| status | TINYINT | ACTIVE / ON_LEAVE / TERMINATED |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## employee_contract

> Hợp đồng lao động

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Contract ID |
| employee_id | BIGINT | FK → employee.user_id |
| contract_type | TINYINT | PROBATION / OFFICIAL / SEASONAL — Loại hợp đồng |
| start_date | DATE | Ngày bắt đầu |
| end_date | DATE | Ngày hết hạn |
| base_salary | DECIMAL(12,2) | Mức lương cơ bản |
| file_url | VARCHAR | File hợp đồng |
| status | TINYINT | ACTIVE / EXPIRED / TERMINATED |
| signed_at | DATETIME | Thời điểm ký hợp đồng |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## attendance

> Chấm công cho nhân viên fulltime

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Attendance ID |
| employee_id | BIGINT | FK → employee.user_id |
| work_date | DATETIME | Ngày làm việc |
| check_in_time | DATETIME | Giờ check-in |
| check_out_time | DATETIME | Giờ check-out |
| status | TINYINT | PRESENT / LATE / ABSENT / ON_LEAVE / HALF_DAY |
| note | TEXT | Ghi chú |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## teaching_rate

> Giá theo giảng viên + khóa học

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Rate ID |
| employee_id | BIGINT | FK → employee.user_id |
| class_id | BIGINT | FK → class.id |
| payment_type | TINYINT | PER_SESSION / PER_HOUR |
| rate | DECIMAL(12,2) | Đơn giá |
| effective_from | DATETIME | Thời điểm bắt đầu |
| effective_to | DATETIME | Thời điểm kết thúc |
| status | TINYINT | Status |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## teaching_session_payment

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Payment record ID |
| class_online_id | BIGINT | FK → class_online.id (unique) |
| employee_id | BIGINT | FK → employee.user_id |
| rate_id | BIGINT | FK → teaching_rate.id |
| rate_applied | DECIMAL(12,2) | Mức lương cho buổi dạy |
| actual_duration_min | INT | Thời lượng thực tế |
| amount | DECIMAL(12,2) | Tổng tiền cho buổi học này |
| status | TINYINT | PENDING / CONFIRMED / PAID |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## salary

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Salary record ID |
| employee_id | BIGINT | FK → employee.user_id |
| period | VARCHAR | Kỳ lương, vd T8/2026 |
| base_salary | DECIMAL(12,2) | Lương cơ bản |
| bonus | DECIMAL(12,2) | Tiền thưởng |
| deduction | DECIMAL(12,2) | Tổng các khoản khấu trừ: BHYT, BHXH, đi muộn, thuế TNCN |
| total_salary | DECIMAL(12,2) | Tổng lương thực nhận |
| status | TINYINT | DRAFT / APPROVED / PAID |
| paid_at | DATETIME | Thời điểm trả lương |
| created_at / created_by / updated_at / updated_by | | Audit fields |

**Unique:** `(employee_id, period)`

---

# Module 5. Student Management (Học viên)

## Tables
* student_profile
* guardian
* interest
* interest_category
* student_interest

## student_profile

| Column | Type | Description |
|---|---|---|
| user_id | BIGINT | PK, FK → user.id |
| student_code | VARCHAR | Mã học viên (unique), vd: STU001 |
| education_level | VARCHAR | Cấp học hiện tại |
| description | VARCHAR | Mô tả |
| goal | VARCHAR | Mục tiêu học tập |
| school_name | VARCHAR | Trường đang học |
| notes | TEXT | Ghi chú |
| is_minor | BOOLEAN | Đủ 18 tuổi chưa — chưa đủ thì cần thêm thông tin người giám hộ, đủ rồi thì bỏ qua |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## guardian

> Người giám hộ

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Guardian ID |
| student_user_id | BIGINT | FK → student_profile.user_id |
| full_name | VARCHAR | Họ tên |
| relationship | TINYINT | FATHER / MOTHER / GUARDIAN / OTHER |
| phone | VARCHAR | Số điện thoại |
| email | VARCHAR | Email |
| address | VARCHAR | Địa chỉ |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## interest_category

> Quan hệ định danh nhiều-nhiều giữa lựa chọn sở thích cố định và danh mục khóa học cố định; catalog cá nhân hóa truy vấn theo ID từ bảng này, không so khớp chuỗi.

| Column | Type | Description |
|---|---|---|
| interest_id | BIGINT | PK, FK → interest.id |
| category_id | BIGINT | PK, FK → category.id |

**Unique:** `(interest_id, category_id)`

---

# Module 6. Learning Progress & Tracking

## Tables
* lesson_progress
* course_progress
* learning_activity_log
* study_goal

## lesson_progress

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Progress ID |
| user_id | BIGINT | FK → student_profile.user_id |
| lesson_id | BIGINT | FK → lesson.id |
| enrollment_id | BIGINT | FK → enrollment.id — Xem thuộc khóa học nào |
| status | TINYINT | NOT_STARTED / IN_PROGRESS / COMPLETED |
| progress_percent | INT | Phần trăm hoàn thành |
| last_position_sec | INT | Vị trí cuối của video, tài liệu |
| time_spent_sec | INT | Tổng thời gian xem thực tế |
| attempt_count | INT | Số lần học viên mở lesson |
| started_at | DATETIME | Thời điểm bắt đầu học |
| completed_at | DATETIME | Thời điểm hoàn thành |
| last_accessed_at | DATETIME | Lần truy cập gần nhất |
| created_at / created_by / updated_at / updated_by | | Audit fields |

**Unique:** `(user_id, lesson_id, enrollment_id)`

## course_progress

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Course progress ID |
| user_id | BIGINT | FK → student_profile.user_id |
| course_id | BIGINT | FK → course.id |
| enrollment_id | BIGINT | FK → enrollment.id |
| total_section | INT | Tổng chương |
| total_lessons | INT | Tổng bài học |
| completed_lessons | INT | Tiến độ |
| progress_percent | INT | Phần trăm hoàn thành khóa học |
| avg_quiz_score | DECIMAL(5,2) | Điểm trung bình bài quiz |
| completed_assignments | INT | Số bài tập đã hoàn thành |
| last_lesson_id | BIGINT | Id bài cuối cùng học viên học, dừng lại |
| last_accessed_at | DATETIME | Thời điểm gần nhất hvien truy cập khóa học |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## learning_activity_log

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Log ID |
| user_id | BIGINT | FK → student_profile.user_id |
| event_type | VARCHAR | Loại hành động |
| entity_type | VARCHAR | Đối tượng, vd: lesson |
| entity_id | BIGINT | Đối tượng thao tác với entity_type |
| metadata | JSON | Vị trí đang xem, điểm quiz, tên, file đã tải xuống |
| device | VARCHAR | Thiết bị |
| occurred_at | DATETIME | Thời điểm xảy ra |

## study_goal

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Goal ID |
| user_id | BIGINT | FK → student_profile.user_id |
| goal_type | TINYINT | DAILY_MINUTES / WEEKLY_LESSONS / COURSE_DEADLINE — Bao nhiêu tiếng/ngày |
| target_value | INT | Mục tiêu |
| course_id | BIGINT | FK → course.id |
| current_streak | INT | Số ngày liên tục học |
| longest_streak | INT | Kỷ lục dài nhất |
| status | TINYINT | ACTIVE / TO_DO / IN_PROGRESS / COMPLETED |
| created_at / created_by / updated_at / updated_by | | Audit fields |

---

# Module 7. Assessment (Kiểm tra & Đánh giá)

## Tables
* quiz
* question
* question_option
* quiz_attempt
* quiz_answer
* assignment
* submission

## quiz

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Quiz ID |
| lesson_id | BIGINT | FK → lesson.id |
| course_id | BIGINT | FK → course.id |
| section_id | BIGINT | FK → course_section.id |
| class_id | BIGINT | NULL, FK → class.id — chỉ giao cho một lớp |
| source_quiz_id | BIGINT | NULL, self FK → quiz.id — Quiz nguồn khi phát hành vào lớp |
| code | VARCHAR | Mã bài kiểm tra |
| title | VARCHAR | Tên bài kiểm tra |
| description | TEXT | Mô tả |
| time_limit_min | INT | Thời gian làm bài |
| pass_score | DECIMAL(5,2) | Số điểm tối thiểu cần đạt để pass bài kiểm tra |
| max_attempts | INT | Số lần được phép làm bài |
| shuffle_questions | BOOLEAN | Trộn thứ tự câu hỏi |
| available_from | DATETIME | Thời điểm học viên được bắt đầu |
| show_result_after_submit | BOOLEAN | Có trả điểm/pass ngay sau nộp hay không |
| due_at | DATETIME | Hạn làm quiz/lịch thi |
| status | VARCHAR | DRAFT / ACTIVE / INACTIVE |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## question

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Question ID |
| quiz_id | BIGINT | FK → quiz.id |
| content | TEXT | Nội dung câu hỏi |
| question_type | TINYINT | SINGLE_CHOICE / MULTIPLE_CHOICE / TRUE_FALSE / FILL_BLANK |
| points | DECIMAL(5,2) | Điểm số |
| order_index | INT | Thứ tự hiển thị |
| explanation | TEXT | Giải thích đáp án |
| status | TINYINT | Status |
| created_at / created_by | | Audit fields |

## question_option

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Option ID |
| question_id | BIGINT | FK → question.id |
| content | VARCHAR | Nội dung đáp án |
| is_correct | BOOLEAN | Đáp án đúng |
| order_index | INT | Thứ tự hiển thị |

## quiz_attempt

> Lưu kết quả mỗi lần học viên làm bài

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Attempt ID |
| quiz_id | BIGINT | FK → quiz.id |
| user_id | BIGINT | FK → student_profile.user_id |
| enrollment_id | BIGINT | FK → enrollment.id |
| attempt_number | INT | Số thứ tự lần làm bài (1, 2, 3 — làm lại lần 1, lần 2, lần 3) |
| score | DECIMAL(5,2) | Điểm đạt được |
| is_passed | BOOLEAN | Đạt / không đạt |
| status | TINYINT | IN_PROGRESS / SUBMITTED / GRADED / EXPIRED |
| started_at | DATETIME | Thời điểm bắt đầu làm bài |
| submitted_at | DATETIME | Thời điểm nộp bài |
| time_spent_sec | INT | Tổng thời gian làm bài |

**Unique:** `(quiz_id, user_id, attempt_number)`

## quiz_answer

> Chi tiết phiếu trả lời

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Answer ID |
| attempt_id | BIGINT | FK → quiz_attempt.id — Thuộc bài làm lần nào |
| question_id | BIGINT | FK → question.id — Xác định câu hỏi |
| selected_option_id | BIGINT | FK → question_option.id — Đáp án của học viên |
| answer_text | TEXT | Câu trả lời tự luận |
| is_correct | BOOLEAN | Đúng/sai |
| points_earned | DECIMAL(5,2) | Số điểm đạt được ở câu này |
| created_at | DATETIME | Thời điểm trả lời |

## assignment

> Quản lý bài tập, nộp file, văn bản, chấm thủ công

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Assignment ID |
| lesson_id | BIGINT | FK → lesson.id |
| course_id | BIGINT | FK → course.id |
| section_id | BIGINT | FK → course_section.id |
| class_id | BIGINT | NULL, FK → class.id — chỉ giao cho một lớp |
| title | VARCHAR | Tên bài tập |
| description | TEXT | Đề bài/hướng dẫn |
| max_score | DECIMAL(5,2) | Điểm tối đa |
| due_date | DATETIME | Hạn nộp bài |
| allow_late | BOOLEAN | Cho phép nộp muộn hay không |
| status | TINYINT | DRAFT / PUBLISHED / CLOSED |
| created_at / created_by / updated_at / updated_by | | Audit fields |

## submission

> Bài làm của học viên

| Column | Type | Description |
|---|---|---|
| id | BIGINT | Submission ID |
| assignment_id | BIGINT | FK → assignment.id |
| user_id | BIGINT | FK → student_profile.user_id |
| enrollment_id | BIGINT | FK → enrollment.id — Xác định khóa học mà bài nộp này thuộc về |
| content_text | TEXT | Nội dung bài làm |
| file_url | VARCHAR | File đính kèm |
| submitted_at | DATETIME | Thời điểm nộp |
| is_late | BOOLEAN | Nộp trễ hạn |
| score | DECIMAL(5,2) | Điểm chấm |
| feedback | TEXT | Nhận xét giáo viên |
| graded_by | BIGINT | FK → user.id |
| graded_at | DATETIME | Thời điểm chấm xong |
| status | TINYINT | SUBMITTED / GRADING / GRADED / RETURNED |
| created_at / created_by / updated_at / updated_by | | Audit fields |

---


# Module 9. AI Recommendation (To Do)

> Thiết kế chi tiết sẽ hoàn thiện sau khi Module 6 & 7 có đủ dữ liệu thực tế để huấn luyện/đánh giá mô hình.

## Tables (dự kiến)
* user_embedding
* course_recommendation
* recommendation_log

---

# Module 10. Course Commerce, PayPal và One-on-One Matching (v4-v7)

Migration áp dụng tuần tự từ `v4_course_commerce_momo_one_on_one.sql` đến `v11_repair_combo_package_class_links.sql`.

## course, class và class_online

- `course`: bổ sung `thumbnail_url`, `learning_objectives`, `prerequisites`.
- `class`: bổ sung `class_kind`, `description`, `registration_open`, `allow_late_enrollment`.
- `class_online`: bổ sung `session_kind`, `counts_toward_package`, `payable`. Buổi thử dùng `TRIAL`, không trừ số buổi và không tạo thù lao.
- Migration `v16_add_class_session_cancellation.sql` bổ sung `cancellation_reason`, `cancelled_at`, `cancelled_by_user_id` để lưu đầy đủ lịch sử hủy buổi học.

## payment_transaction và idempotency

Các cột MoMo ở v4 được giữ để tương thích migration đã áp dụng. Luồng PayPal dùng `paypal_request_id`, `gateway_order_id` (PayPal order ID), `paypal_capture_id`, `gateway_amount`, `gateway_currency`; request/capture ID đều unique. Refund toàn phần dùng thêm `paypal_refund_request_id`, `paypal_refund_id`, `refund_amount`, `refund_currency`, `refund_reason`, `refunded_at`; hai PayPal refund ID có unique constraint để retry không hoàn tiền hai lần. `enrollment` unique theo `(user_id, course_id)` và `enrollment_package` unique theo `order_item_id`. `order_item.one_on_one_needs` giữ snapshot nhu cầu đã thanh toán để matching chỉ được tạo sau capture PayPal.

## Voucher sở hữu và snapshot hóa đơn (v7)

- `user_coupon` liên kết duy nhất `(user_id, coupon_id)` và quản lý trạng thái `AVAILABLE`, `RESERVED`, `USED`, `EXPIRED`.
- `order.user_coupon_id` tham chiếu đúng quyền voucher đã dùng; `coupon_code` tiếp tục giữ snapshot mã hiển thị.
- `order_item.discount_snapshot` và `final_price` giữ số tiền từng dòng tại lúc checkout để xem/tải hóa đơn không phụ thuộc giá gói hiện tại.
- Voucher được reserve khi tạo order, chuyển `USED` sau PayPal capture, trả `AVAILABLE` khi order PENDING bị hủy/hết hạn hoặc refund nếu coupon còn hiệu lực.

## one_on_one_request

`one_on_one_request` liên kết duy nhất với một `enrollment_package`, học viên, assignee và lớp/buổi thử. Cột `version` hỗ trợ optimistic locking, còn các transition tranh chấp sử dụng pessimistic row lock. `one_on_one_rejected_instructor` có unique `(request_id, instructor_id)` để người đã bị từ chối không nhận lại cùng yêu cầu.

## Cart, quyền theo package và thảo luận lớp (v9)

- `cart_item.one_on_one_needs` giữ bản nháp nhu cầu của gói 1-1; bản nháp chỉ được chuyển thành yêu cầu matching sau capture thanh toán thành công.
- `enrollment_package.status` quản lý riêng `ACTIVE`, `REFUNDED`, `CANCELLED`, `REVOKED`, `EXPIRED`; quyền học chỉ tính từ package `ACTIVE` chưa hết hạn.

## Support chat

- `anonymous_visitor.id` và `support_conversation.visitor_id` dùng `BIGINT` Snowflake.
- `support_conversation.last_hr_message_at`, `last_visitor_message_at` và `close_requested_at` lưu mốc timeout: supporter được yêu cầu đóng sau 5 phút visitor chưa phản hồi; hệ thống tự đóng sau 20 phút.
- `support_conversation.full_name` và `email` là thông tin định danh chính trên hàng đợi supporter; `phone` chỉ còn tùy chọn và không hiển thị trên card.
- Policy support không dùng bảng riêng. Tài liệu được lưu ở MinIO dưới `policies/`, metadata dùng `file_metadata.usage_type = POLICY`; bản `ACTIVE` mới nhất là bản hiện hành.
- Thumbnail khóa học dùng `file_metadata.usage_type = COURSE_THUMBNAIL`, `reference_entity_type = Course` và `reference_entity_id` là Snowflake ID của khóa học.
- Migration `v19_expand_file_usage_type_for_policy.sql` bổ sung giá trị `POLICY` vào enum `file_metadata.usage_type` của MySQL, đồng bộ với backend.
- `support_chat_message.message_type` hỗ trợ thêm `RESOURCE_CARD` và `ATTACHMENT`. Card catalog và thông tin file MinIO được lưu trong cột JSON `metadata`.
- Attachment dùng prefix MinIO `support/{conversationId}/`, giới hạn 10MB và chỉ được gửi khi conversation `ACTIVE`; schema không cần migration mới vì `message_type` là `VARCHAR` và `metadata` đã là JSON.
- `support_hr_presence.status` do heartbeat/workload tự suy ra. Heartbeat quá 90 giây chuyển `OFFLINE`; ticket của supporter offline được trả về queue và ưu tiên phân phối cho `ONLINE_AVAILABLE`, sau đó tới `ONLINE_BUSY` có workload thấp nhất.
- `class_stream_post` bổ sung loại bài, ghim, khóa bình luận và ẩn nội dung.
- `class_stream_comment` lưu trả lời phân trang; khóa ngoại bài dùng cascade để không để lại bình luận mồ côi.

## Chuẩn hóa hình thức gói học (v23)

- `course_package.delivery_mode` chỉ còn `SELF_STUDY`, `GROUP_CLASS`, `ONE_ON_ONE`.
- `course_package.class_id` chỉ dùng cho `GROUP_CLASS`; sức chứa được kiểm tra bằng thành viên thực tế trong `class_member`.
- Migration v23 chuyển dữ liệu hình thức cũ theo quyền lợi chính: có lớp thành `GROUP_CLASS`, có buổi gia sư thành `ONE_ON_ONE`, còn lại thành `SELF_STUDY`.

## AI assessment và learning scope (v29)

Migration `v29_ai_class_learning_scope.sql` bổ sung:

- `class_resource.rag_status`, `rag_chunks_count`, `rag_error` để theo dõi ingestion Qdrant và retry lỗi; resource tồn tại trước migration được chuyển `FAILED` để UI cho phép đồng bộ có chủ đích.
- `quiz.source_quiz_id`, `available_from`, `show_result_after_submit`; bản Quiz có `class_id` là bản sao độc lập đã phát hành cho lớp.
- `ai_conversation.course_id`, `class_id`, `lesson_id`, `retrieval_scope` để không trộn hội thoại giữa các ngữ cảnh học tập.
- Index theo trạng thái RAG, class/source Quiz, lịch Quiz và context conversation.

`source_quiz_id` dùng `ON DELETE SET NULL`; xóa Quiz nguồn không xóa đề đã giao hay attempts của học viên.

---
