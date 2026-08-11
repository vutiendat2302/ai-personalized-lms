package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.response.StudentActivityHistoryResponse;
import com.ailms.response.StudentCatalogCourseResponse;
import com.ailms.response.StudentDashboardResponse;
import com.ailms.response.StudentPortalItemResponse;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.request.CreateStudyGoalRequest;
import com.ailms.request.UpdateStudyGoalRequest;
import com.ailms.response.StudyGoalResponse;
import com.ailms.request.OnboardingRequest;
import com.ailms.response.StudentProfileResponse;
import com.ailms.response.StudentPersonalizationResponse;
import com.ailms.response.UserCouponResponse;
import com.ailms.request.RefundRequest;
import com.ailms.request.OneOnOneNeedsRequest;

import java.util.List;
import java.time.LocalDateTime;

/** Nghiệp vụ tổng hợp dành riêng cho cổng học viên. */
public interface IStudentPortalService {
    /** Lấy hồ sơ onboarding và lựa chọn cá nhân hóa của học viên hiện tại. */
    StudentPersonalizationResponse getPersonalization(Long userId);
    /** Lấy lịch sử hoạt động học tập theo trang. */
    PageResponse<StudentActivityHistoryResponse> getLearningHistory(Long userId, int page, int size, String action,
            LocalDateTime from, LocalDateTime to);
    /** Lấy chi tiết một hoạt động học tập thuộc học viên. */
    StudentActivityHistoryResponse getLearningHistoryDetail(Long userId, Long id);
    /** Xóa một hoạt động học tập thuộc học viên. */
    void deleteLearningHistory(Long userId, Long id);
    /** Lấy lịch sử thao tác hệ thống theo trang. */
    PageResponse<StudentActivityHistoryResponse> getSystemHistory(Long userId, int page, int size, String action,
            LocalDateTime from, LocalDateTime to);
    /** Lấy chi tiết một thao tác hệ thống thuộc học viên. */
    StudentActivityHistoryResponse getSystemHistoryDetail(Long userId, Long id);
    /** Xóa một thao tác hệ thống thuộc học viên. */
    void deleteSystemHistory(Long userId, Long id);
    /** Tổng hợp chỉ số dashboard và các bài tập sắp đến hạn. */
    StudentDashboardResponse getDashboard(Long userId);
    /** Lấy khóa học đang mở bán theo sở thích hoặc độ phổ biến. */
    PageResponse<StudentCatalogCourseResponse> getCatalog(Long userId, int page, int size, String keyword);
    /** Lấy tất cả khóa học đủ điều kiện bán công khai, không áp dụng sở thích. */
    PageResponse<StudentCatalogCourseResponse> getAllCatalogCourses(Long userId, int page, int size, String keyword);
    /** Lấy các khóa học mà học viên đã ghi danh. */
    List<StudentPortalItemResponse.CourseCard> getCourses(Long userId, String status);
    /** Lấy nội dung khóa học nếu học viên đã ghi danh. */
    CourseCurriculumResponse getCourseDetail(Long userId, Long courseId);
    /** Lấy lịch học trực tuyến sắp tới. */
    List<StudentPortalItemResponse.ScheduleItem> getSchedule(Long userId);
    /** Lấy bài tập của các khóa học đã ghi danh. */
    List<StudentPortalItemResponse.AssignmentItem> getAssignments(Long userId);
    /** Lấy quiz/bài thi cần làm và kết quả gần nhất của học viên. */
    List<StudentPortalItemResponse.QuizItem> getQuizzes(Long userId);
    /** Lấy chứng chỉ đã cấp cho học viên. */
    List<StudentPortalItemResponse.CertificateItem> getCertificates(Long userId);
    /** Tổng hợp biểu đồ tiến độ học tập từ dữ liệu thật. */
    StudentPortalItemResponse.ProgressAnalytics getProgress(Long userId);
    /** Lấy mục tiêu học tập của học viên. */
    List<StudentPortalItemResponse.GoalItem> getGoals(Long userId);
    /** Tạo mục tiêu và cưỡng chế chủ sở hữu theo JWT. */
    StudentPortalItemResponse.GoalItem createGoal(Long userId, CreateStudyGoalRequest request);
    /** Cập nhật mục tiêu chung thuộc học viên hiện tại. */
    StudentPortalItemResponse.GoalItem updateGoal(Long userId, Long goalId, UpdateStudyGoalRequest request);
    /** Lấy giỏ hàng của học viên. */
    List<StudentPortalItemResponse.CartItem> getCart(Long userId);
    /** Thêm gói học đang mở bán vào giỏ hàng. */
    StudentPortalItemResponse.CartItem addToCart(Long userId, Long coursePackageId, OneOnOneNeedsRequest needs);
    /** Xóa một dòng thuộc giỏ hàng của học viên. */
    void removeFromCart(Long userId, Long cartItemId);
    /** Lấy ví voucher của học viên hiện tại. */
    List<UserCouponResponse> getVouchers(Long userId);
    /** Kiểm tra coupon và tính số tiền giảm trên giỏ hàng hiện tại. */
    StudentPortalItemResponse.CouponValidation validateCoupon(Long userId, String code, List<Long> coursePackageIds);
    /** Lấy lịch sử đơn hàng của học viên. */
    List<StudentPortalItemResponse.OrderItem> getOrders(Long userId);
    /** Hoàn tất onboarding cho học viên JWT hiện tại. */
    StudentProfileResponse completeOnboarding(Long userId, OnboardingRequest request);
    /** Hoàn tiền đơn hàng sau khi xác nhận quyền sở hữu. */
    void refundOrder(Long userId, Long orderId, RefundRequest request);
}
