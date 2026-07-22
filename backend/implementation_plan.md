# Backend API Endpoints & Controller Testing Plan

Task: **Lấy tất cả các endpoint của backend và viết Controller Test cho tất cả các endpoint.**

---

## 📊 Summary of Backend Controllers & Endpoints

Currently, the backend codebase contains **50 Controller classes** and **371 Endpoints**, categorized by business domain:

### 1. Authentication & Security Controllers
- `AuthController`: Đăng nhập, đăng ký, OTP, refresh token, đổi/quên/đặt mật khẩu (10 endpoints)
- `UserController`: QL Người dùng, hồ sơ, phân quyền, bulk action, verify email (14 endpoints)
- `RoleController`: QL Vai trò, gán quyền, sao chép role, danh sách user theo role (11 endpoints)
- `PermissionController`: QL Quyền hạn hệ thống, phân trang (6 endpoints)

### 2. HR & Personnel Management Controllers
- `EmployeeController`: Hồ sơ nhân sự, thôi việc, đánh giá thử việc (8 endpoints)
- `EmployeeContractController`: Hợp đồng lao động nhân sự (7 endpoints)
- `DepartmentController`: Phòng ban (6 endpoints)
- `AttendanceController`: Chấm công (7 endpoints)
- `LeaveRequestController`: Nghỉ phép & duyệt đơn (8 endpoints)
- `SalaryController`: Tính lương, duyệt & chi trả lương (9 endpoints)
- `TeachingRateController`: Đơn giá giờ dạy (7 endpoints)
- `TeachingSessionPaymentController`: Chấm công & thanh toán ca dạy GV/TA (9 endpoints)

### 3. Student & Learner Controllers
- `StudentProfileController`: Hồ sơ học viên (6 endpoints)
- `StudyGoalController`: Mục tiêu học tập & đánh giá AI (10 endpoints)
- `GuardianController`: Người giám hộ (7 endpoints)
- `LearningActivityLogController`: Nhật ký hoạt động học tập (8 endpoints)
- `LearningSessionController`: Phiên học & heartbeat (5 endpoints)
- `OnboardingController`: Luồng onboarding học viên (2 endpoints)

### 4. Course & Content Controllers
- `CategoryController`: Danh mục khóa học (6 endpoints)
- `TeacherCategoryController`: Phân công GV theo danh mục (6 endpoints)
- `CourseController`: Khóa học, duyệt khóa học, submit (7 endpoints)
- `CourseSectionController`: Chương học & sắp xếp lại section (8 endpoints)
- `LessonController`: Bài học, preview, sắp xếp bài học (8 endpoints)
- `LessonResourceController`: Tài nguyên bài học (5 endpoints)
- `LessonProgressController`: Tiến độ học bài tập/chương (9 endpoints)
- `CourseProgressController`: Tiến độ học tổng thể khóa học (9 endpoints)
- `CoursePackageController`: Gói khóa học (7 endpoints)
- `CourseTeacherController`: Phân công GV dạy khóa học (8 endpoints)
- `CourseMemberController`: Thành viên khóa học (8 endpoints)
- `EnrollmentController`: Ghi danh & đăng ký học (8 endpoints)
- `ReviewController`: Đánh giá khóa học & duyệt review (4 endpoints)

### 5. Order, Commerce & Coupon Controllers
- `CartController`: Giỏ hàng (6 endpoints)
- `OrderController`: Đặt hàng, thanh toán, refund, webhook callback (7 endpoints)
- `CouponController`: Mã giảm giá, áp dụng & kiểm tra coupon (7 endpoints)

### 6. Class & Matching Controllers
- `ClassController`: Tạo lớp học, hủy lớp, đổi GV, đổi lịch (8 endpoints)
- `ClassManagementController`: Quản lý vận hành lớp (5 endpoints)
- `ClassMemberController`: Học viên trong lớp (8 endpoints)
- `ClassOnlineController`: Lớp học trực tuyến Teams/Zoom (5 endpoints)

### 7. Assessment, Quiz & Submission Controllers
- `QuizController`: Bài kiểm tra Quiz (9 endpoints)
- `QuestionController`: Câu hỏi quiz (7 endpoints)
- `QuestionOptionController`: Đáp án lựa chọn (7 endpoints)
- `QuizAttemptController`: Lượt làm bài quiz (9 endpoints)
- `QuizAnswerController`: Câu trả lời bài quiz (8 endpoints)
- `AssignmentController`: Bài tập về nhà (8 endpoints)
- `SubmissionController`: Nộp bài & chấm điểm bài tập (8 endpoints)
- `AssessmentController`: Tổng hợp đánh giá & báo cáo (4 endpoints)

### 8. Utilities, System & Approval Controllers
- `CertificateController`: Chứng chỉ & tra cứu công khai (5 endpoints)
- `FileController`: Upload/download/preview file & MinIO storage (10 endpoints)
- `AuditLogController`: Audit log nhật ký thao tác (3 endpoints)
- `ApprovalRequestController`: Phê duyệt yêu cầu hệ thống (7 endpoints)

---

## 🛠 Testing Strategy & Architecture

We will write comprehensive Unit Tests using Spring's `@WebMvcTest` / `MockMvc` framework for all controller classes.

### Pattern for Controller Tests:
1. Use `@WebMvcTest(TargetController.class)` or `@SpringBootTest` + `@AutoConfigureMockMvc`.
2. Disable or mock Spring Security / JwtFilter / CustomUserDetails where needed using `@MockBean` or `@WithMockUser`.
3. `@MockBean` all required Services (e.g. `IUserService`, `IAuthService`, `JwtTokenProvider`, etc.) for each controller.
4. Test all HTTP methods (GET, POST, PUT, DELETE, PATCH):
   - Valid inputs -> Expect HTTP status 200/201 + response structure validation (`jsonPath`).
   - Invalid/Missing parameters -> Expect HTTP status 400 Bad Request or error handling.
   - Resource not found -> Expect HTTP status 404 / 500 mapped error handling.

---

## 📁 Proposed Changes

We will create **50 new test classes** under `src/test/java/com/ailms/controller/`:

#### [NEW] [AuthControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/AuthControllerTest.java)
#### [NEW] [UserControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/UserControllerTest.java)
#### [NEW] [RoleControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/RoleControllerTest.java)
#### [NEW] [PermissionControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/PermissionControllerTest.java)
#### [NEW] [EmployeeControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/EmployeeControllerTest.java)
#### [NEW] [EmployeeContractControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/EmployeeContractControllerTest.java)
#### [NEW] [DepartmentControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/DepartmentControllerTest.java)
#### [NEW] [AttendanceControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/AttendanceControllerTest.java)
#### [NEW] [LeaveRequestControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/LeaveRequestControllerTest.java)
#### [NEW] [SalaryControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/SalaryControllerTest.java)
#### [NEW] [TeachingRateControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/TeachingRateControllerTest.java)
#### [NEW] [TeachingSessionPaymentControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/TeachingSessionPaymentControllerTest.java)
#### [NEW] [StudentProfileControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/StudentProfileControllerTest.java)
#### [NEW] [StudyGoalControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/StudyGoalControllerTest.java)
#### [NEW] [GuardianControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/GuardianControllerTest.java)
#### [NEW] [LearningActivityLogControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/LearningActivityLogControllerTest.java)
#### [NEW] [LearningSessionControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/LearningSessionControllerTest.java)
#### [NEW] [OnboardingControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/OnboardingControllerTest.java)
#### [NEW] [CategoryControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CategoryControllerTest.java)
#### [NEW] [TeacherCategoryControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/TeacherCategoryControllerTest.java)
#### [NEW] [CourseControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CourseControllerTest.java)
#### [NEW] [CourseSectionControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CourseSectionControllerTest.java)
#### [NEW] [LessonControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/LessonControllerTest.java)
#### [NEW] [LessonResourceControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/LessonResourceControllerTest.java)
#### [NEW] [LessonProgressControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/LessonProgressControllerTest.java)
#### [NEW] [CourseProgressControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CourseProgressControllerTest.java)
#### [NEW] [CoursePackageControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CoursePackageControllerTest.java)
#### [NEW] [CourseTeacherControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CourseTeacherControllerTest.java)
#### [NEW] [CourseMemberControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CourseMemberControllerTest.java)
#### [NEW] [EnrollmentControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/EnrollmentControllerTest.java)
#### [NEW] [ReviewControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/ReviewControllerTest.java)
#### [NEW] [CartControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CartControllerTest.java)
#### [NEW] [OrderControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/OrderControllerTest.java)
#### [NEW] [CouponControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CouponControllerTest.java)
#### [NEW] [ClassControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/ClassControllerTest.java)
#### [NEW] [ClassManagementControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/ClassManagementControllerTest.java)
#### [NEW] [ClassMemberControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/ClassMemberControllerTest.java)
#### [NEW] [ClassOnlineControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/ClassOnlineControllerTest.java)
#### [NEW] [QuizControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/QuizControllerTest.java)
#### [NEW] [QuestionControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/QuestionControllerTest.java)
#### [NEW] [QuestionOptionControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/QuestionOptionControllerTest.java)
#### [NEW] [QuizAttemptControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/QuizAttemptControllerTest.java)
#### [NEW] [QuizAnswerControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/QuizAnswerControllerTest.java)
#### [NEW] [AssignmentControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/AssignmentControllerTest.java)
#### [NEW] [SubmissionControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/SubmissionControllerTest.java)
#### [NEW] [AssessmentControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/AssessmentControllerTest.java)
#### [NEW] [CertificateControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/CertificateControllerTest.java)
#### [NEW] [FileControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/FileControllerTest.java)
#### [NEW] [AuditLogControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/AuditLogControllerTest.java)
#### [NEW] [ApprovalRequestControllerTest.java](file:///c:/Users/Tplus%20Computer/Documents/project/ai-personalized-lms/backend/ailms/src/test/java/com/ailms/controller/ApprovalRequestControllerTest.java)

---

## 🧪 Verification Plan

1. **Test Compilation**:
   Run `.\mvnw.cmd test-compile` to verify that all test classes compile without syntax or import errors.

2. **Test Execution**:
   Run `.\mvnw.cmd test` to execute all controller test suites and confirm all test cases pass.

3. **Report Generation**:
   Summarize total test count and pass rates.
