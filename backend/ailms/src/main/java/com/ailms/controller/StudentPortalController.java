package com.ailms.controller;

import com.ailms.response.ApiResponse;
import com.ailms.response.UserCouponResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.StudentActivityHistoryResponse;
import com.ailms.response.StudentCatalogCourseResponse;
import com.ailms.response.StudentDashboardResponse;
import com.ailms.response.StudentPortalItemResponse;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.StudyGoalResponse;
import com.ailms.request.CreateStudyGoalRequest;
import com.ailms.request.UpdateStudyGoalRequest;
import com.ailms.request.StudentCouponValidationRequest;
import com.ailms.request.StudentCartAddRequest;
import com.ailms.request.OnboardingRequest;
import com.ailms.request.CreateReviewRequest;
import com.ailms.response.StudentProfileResponse;
import com.ailms.response.StudentPersonalizationResponse;
import com.ailms.response.OrderResponse;
import com.ailms.response.ReviewResponse;
import com.ailms.response.CertificateResponse;
import com.ailms.request.RefundRequest;
import jakarta.validation.Valid;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IStudentPortalService;
import com.ailms.service.IOrderService;
import com.ailms.service.IInvoiceService;
import com.ailms.service.IAssessmentService;
import com.ailms.service.IReviewService;
import com.ailms.service.ICertificateService;
import com.ailms.request.SubmitAssignmentRequest;
import com.ailms.request.SubmitQuizAttemptRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDateTime;

import java.util.List;

/** API tổng hợp cho học viên, luôn giới hạn dữ liệu theo tài khoản JWT hiện tại. */
@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("${api.prefix}/student")
@PreAuthorize("hasAuthority('ROLE_STUDENT')")
public class StudentPortalController {
    private final IStudentPortalService studentPortalService;
    private final IOrderService orderService;
    private final IInvoiceService invoiceService;
    private final IAssessmentService assessmentService;
    private final IReviewService reviewService;
    private final ICertificateService certificateService;

    /** Hoàn tất onboarding cho học viên hiện tại mà không nhận userId từ client. */
    @PostMapping("/onboarding")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> completeOnboarding(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestBody OnboardingRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Hoàn tất onboarding thành công",
                studentPortalService.completeOnboarding(currentUser.getUser().getId(), request)));
    }

    /** Lấy trình độ, mục tiêu, nền tảng, trường học và sở thích của học viên hiện tại. */
    @GetMapping({"/profile", "/profile/personalization"})
    public ResponseEntity<ApiResponse<StudentPersonalizationResponse>> getPersonalization(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy hồ sơ cá nhân hóa thành công",
                studentPortalService.getPersonalization(currentUser.getUser().getId())));
    }

    /** Lấy danh sách lịch sử learning có phân trang. */
    @GetMapping("/activities/learning")
    public ResponseEntity<ApiResponse<PageResponse<StudentActivityHistoryResponse>>> getLearningHistory(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.of("Lấy lịch sử học tập thành công",
                studentPortalService.getLearningHistory(currentUser.getUser().getId(), page, size, action, from, to)));
    }

    /** Lấy chi tiết một lịch sử learning thuộc học viên hiện tại. */
    @GetMapping("/activities/learning/{id}")
    public ResponseEntity<ApiResponse<StudentActivityHistoryResponse>> getLearningHistoryDetail(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Lấy chi tiết lịch sử học tập thành công",
                studentPortalService.getLearningHistoryDetail(currentUser.getUser().getId(), id)));
    }

    /** Xóa một lịch sử learning thuộc học viên hiện tại. */
    @DeleteMapping("/activities/learning/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLearningHistory(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long id) {
        studentPortalService.deleteLearningHistory(currentUser.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.message("Xóa lịch sử học tập thành công"));
    }

    /** Lấy danh sách lịch sử hệ thống có phân trang. */
    @GetMapping("/activities/system")
    public ResponseEntity<ApiResponse<PageResponse<StudentActivityHistoryResponse>>> getSystemHistory(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ApiResponse.of("Lấy lịch sử hệ thống thành công",
                studentPortalService.getSystemHistory(currentUser.getUser().getId(), page, size, action, from, to)));
    }

    /** Lấy chi tiết một lịch sử hệ thống thuộc học viên hiện tại. */
    @GetMapping("/activities/system/{id}")
    public ResponseEntity<ApiResponse<StudentActivityHistoryResponse>> getSystemHistoryDetail(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Lấy chi tiết lịch sử hệ thống thành công",
                studentPortalService.getSystemHistoryDetail(currentUser.getUser().getId(), id)));
    }

    /** Xóa một lịch sử hệ thống thuộc học viên hiện tại. */
    @DeleteMapping("/activities/system/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSystemHistory(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long id) {
        studentPortalService.deleteSystemHistory(currentUser.getUser().getId(), id);
        return ResponseEntity.ok(ApiResponse.message("Xóa lịch sử hệ thống thành công"));
    }

    /** Lấy streak, thống kê khóa học và deadline cho dashboard học viên. */
    @GetMapping("/dashboard/metrics")
    public ResponseEntity<ApiResponse<StudentDashboardResponse>> getDashboardMetrics(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy chỉ số dashboard thành công",
                studentPortalService.getDashboard(currentUser.getUser().getId())));
    }

    /** Lấy danh sách khóa học mở bán được cá nhân hóa cho học viên. */
    @GetMapping("/catalog")
    public ResponseEntity<ApiResponse<PageResponse<StudentCatalogCourseResponse>>> getCatalog(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách khóa học gợi ý thành công",
                studentPortalService.getCatalog(currentUser.getUser().getId(), page, size, keyword)));
    }

    /** Lấy toàn bộ khóa học đủ điều kiện mở bán, tách khỏi catalog cá nhân hóa. */
    @GetMapping("/catalog/all")
    public ResponseEntity<ApiResponse<PageResponse<StudentCatalogCourseResponse>>> getAllCatalogCourses(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.of("Lấy tất cả khóa học đang mở bán thành công",
                studentPortalService.getAllCatalogCourses(currentUser.getUser().getId(), page, size, keyword)));
    }

    /** Lấy danh sách khóa học mà học viên đã ghi danh. */
    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.CourseCard>>> getCourses(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.of("Lấy khóa học của học viên thành công",
                studentPortalService.getCourses(currentUser.getUser().getId(), status)));
    }

    /** Lấy nội dung chi tiết của khóa học đã ghi danh. */
    @GetMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<CourseCurriculumResponse>> getCourseDetail(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.of("Lấy nội dung khóa học thành công",
                studentPortalService.getCourseDetail(currentUser.getUser().getId(), courseId)));
    }

    /** Gửi một đánh giá khóa học và giáo viên bằng danh tính học viên JWT. */
    @PostMapping("/courses/{courseId}/review")
    public ResponseEntity<ApiResponse<ReviewResponse>> createCourseReview(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long courseId,
            @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Gửi đánh giá thành công",
                reviewService.createReview(currentUser.getUser().getId(), courseId, request)));
    }

    /** Cấp bù hoặc lấy chứng chỉ của enrollment đã hoàn thành thuộc học viên hiện tại. */
    @PostMapping("/enrollments/{enrollmentId}/certificate")
    public ResponseEntity<ApiResponse<CertificateResponse>> issueCertificate(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long enrollmentId) {
        return ResponseEntity.ok(ApiResponse.of("Cấp chứng chỉ thành công",
                certificateService.evaluateAndGenerateForUser(enrollmentId, currentUser.getUser().getId())));
    }

    /** Lấy lịch học trực tuyến sắp tới của học viên. */
    @GetMapping("/schedule")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.ScheduleItem>>> getSchedule(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy lịch học thành công",
                studentPortalService.getSchedule(currentUser.getUser().getId())));
    }

    /** Lấy bài tập thuộc các khóa học đã ghi danh. */
    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.AssignmentItem>>> getAssignments(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy bài tập thành công",
                studentPortalService.getAssignments(currentUser.getUser().getId())));
    }

    /** Lấy quiz/bài thi cần làm và kết quả của chính học viên. */
    @GetMapping("/quizzes")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.QuizItem>>> getQuizzes(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy quiz cần làm thành công",
                studentPortalService.getQuizzes(currentUser.getUser().getId())));
    }

    /** Bắt đầu một lượt quiz bằng danh tính học viên từ JWT. */
    @PostMapping("/quizzes/{quizId}/attempts")
    public ResponseEntity<ApiResponse<Long>> startQuizAttempt(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long quizId) {
        return ResponseEntity.ok(ApiResponse.of("Bắt đầu làm quiz thành công",
                assessmentService.startQuizAttempt(currentUser.getUser().getId(), quizId)));
    }

    /** Nộp quiz sau khi backend xác minh attempt thuộc học viên hiện tại. */
    @PostMapping("/quiz-attempts/{attemptId}/submit")
    public ResponseEntity<ApiResponse<Void>> submitQuizAttempt(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long attemptId,
            @Valid @RequestBody SubmitQuizAttemptRequest request) {
        assessmentService.submitQuizAttemptForUser(currentUser.getUser().getId(), attemptId, request);
        return ResponseEntity.ok(ApiResponse.message("Nộp quiz thành công"));
    }

    /** Nộp bài tập bằng danh tính học viên JWT và kiểm tra deadline ở backend. */
    @PostMapping("/assignments/{assignmentId}/submissions")
    public ResponseEntity<ApiResponse<Long>> submitAssignment(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long assignmentId,
            @Valid @RequestBody SubmitAssignmentRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Nộp bài tập thành công",
                assessmentService.submitAssignment(currentUser.getUser().getId(), assignmentId, request)));
    }

    /** Lấy chứng chỉ đã cấp cho học viên. */
    @GetMapping("/certificates")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.CertificateItem>>> getCertificates(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy chứng chỉ thành công",
                studentPortalService.getCertificates(currentUser.getUser().getId())));
    }

    /** Tải PDF chứng chỉ đã cấp của chính học viên hiện tại. */
    @GetMapping(value = "/certificates/{certificateId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadCertificate(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long certificateId) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=AILMS-certificate-" + certificateId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(certificateService.downloadForOwner(certificateId, currentUser.getUser().getId()));
    }

    /** Lấy dữ liệu phân tích tiến độ học tập. */
    @GetMapping("/progress")
    public ResponseEntity<ApiResponse<StudentPortalItemResponse.ProgressAnalytics>> getProgress(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy tiến độ học tập thành công",
                studentPortalService.getProgress(currentUser.getUser().getId())));
    }

    /** Lấy mục tiêu học tập của học viên. */
    @GetMapping("/goals")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.GoalItem>>> getGoals(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy mục tiêu học tập thành công",
                studentPortalService.getGoals(currentUser.getUser().getId())));
    }

    /** Tạo mục tiêu học tập cho tài khoản JWT hiện tại. */
    @PostMapping("/goals")
    public ResponseEntity<ApiResponse<StudentPortalItemResponse.GoalItem>> createGoal(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @RequestBody CreateStudyGoalRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Tạo mục tiêu học tập thành công",
                studentPortalService.createGoal(currentUser.getUser().getId(), request)));
    }

    /** Cập nhật loại hoặc giá trị của mục tiêu chung hiện tại. */
    @PutMapping("/goals/{goalId}")
    public ResponseEntity<ApiResponse<StudentPortalItemResponse.GoalItem>> updateGoal(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @PathVariable Long goalId,
            @RequestBody UpdateStudyGoalRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật mục tiêu học tập thành công",
                studentPortalService.updateGoal(currentUser.getUser().getId(), goalId, request)));
    }

    /** Lấy giỏ hàng của học viên. */
    @GetMapping("/cart")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.CartItem>>> getCart(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy giỏ hàng thành công",
                studentPortalService.getCart(currentUser.getUser().getId())));
    }

    /** Thêm một gói học đang mở bán vào giỏ hàng. */
    @PostMapping("/cart")
    public ResponseEntity<ApiResponse<StudentPortalItemResponse.CartItem>> addToCart(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody StudentCartAddRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Thêm gói học vào giỏ hàng thành công",
                studentPortalService.addToCart(currentUser.getUser().getId(), request.getCoursePackageId(),
                        request.getOneOnOneNeeds())));
    }

    /** Xóa một gói khỏi giỏ hàng của chính học viên. */
    @DeleteMapping("/cart/{cartItemId}")
    public ResponseEntity<ApiResponse<Void>> removeFromCart(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long cartItemId) {
        studentPortalService.removeFromCart(currentUser.getUser().getId(), cartItemId);
        return ResponseEntity.ok(ApiResponse.message("Xóa gói khỏi giỏ hàng thành công"));
    }

    /** Lấy danh sách voucher đã được cấp cho học viên hiện tại. */
    @GetMapping("/vouchers")
    public ResponseEntity<ApiResponse<List<UserCouponResponse>>> getVouchers(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy voucher của học viên thành công",
                studentPortalService.getVouchers(currentUser.getUser().getId())));
    }

    /** Kiểm tra coupon dựa trên giỏ hàng hiện tại. */
    @PostMapping("/cart/coupon")
    public ResponseEntity<ApiResponse<StudentPortalItemResponse.CouponValidation>> validateCoupon(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody StudentCouponValidationRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Kiểm tra coupon thành công",
                studentPortalService.validateCoupon(
                        currentUser.getUser().getId(), request.getCode(), request.getCoursePackageIds())));
    }

    /** Lấy lịch sử đơn hàng của học viên. */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<StudentPortalItemResponse.OrderItem>>> getOrders(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(ApiResponse.of("Lấy đơn hàng thành công",
                studentPortalService.getOrders(currentUser.getUser().getId())));
    }

    /** Lấy chi tiết một đơn hàng thuộc chính học viên. */
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderDetail(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long orderId) {
        return ResponseEntity.ok(ApiResponse.of("Lấy chi tiết đơn hàng thành công",
                orderService.getOwnedOrderById(currentUser.getUser().getId(), orderId)));
    }

    /** Tải hóa đơn PDF của đơn hàng đã thanh toán thuộc chính học viên. */
    @GetMapping(value = "/orders/{orderId}/invoice.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadInvoice(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long orderId) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=AILMS-invoice-" + orderId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(invoiceService.downloadPaymentForOwner(currentUser.getUser().getId(), orderId));
    }

    /** Tải chứng từ hoàn tiền đã lưu trên MinIO của đúng học viên. */
    @GetMapping(value = "/orders/{orderId}/refund-invoice.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadRefundInvoice(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long orderId) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=AILMS-refund-" + orderId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(invoiceService.getRefundForOwner(currentUser.getUser().getId(), orderId));
    }

    /** Hoàn tiền đơn hàng thuộc chính học viên hiện tại. */
    @PostMapping("/orders/{orderId}/refund")
    public ResponseEntity<ApiResponse<Void>> refundOrder(
            @AuthenticationPrincipal CustomUserDetails currentUser, @PathVariable Long orderId,
            @Valid @RequestBody RefundRequest request) {
        studentPortalService.refundOrder(currentUser.getUser().getId(), orderId, request);
        return ResponseEntity.ok(ApiResponse.message("Đã gửi yêu cầu hoàn tiền, chờ HR/Admin phê duyệt"));
    }
}
