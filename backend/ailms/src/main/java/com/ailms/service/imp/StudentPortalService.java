package com.ailms.service.imp;

import com.ailms.entity.AssignmentEntity;
import com.ailms.entity.AuditLogEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.CourseProgressEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.EnrollmentPackageEntity;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.SubmissionEntity;
import com.ailms.entity.CertificateEntity;
import com.ailms.entity.CartItemEntity;
import com.ailms.entity.OrderEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.ClassEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.entity.QuizAttemptEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.AssignmentRepository;
import com.ailms.repository.AuditLogRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.CourseProgressRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LearningActivityLogRepository;
import com.ailms.repository.StudentInterestRepository;
import com.ailms.repository.StudyGoalRepository;
import com.ailms.repository.SubmissionRepository;
import com.ailms.repository.CertificateRepository;
import com.ailms.repository.CartItemRepository;
import com.ailms.repository.OrderRepository;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.LearningSessionRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.repository.QuizAttemptRepository;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.response.PageResponse;
import com.ailms.response.StudentActivityHistoryResponse;
import com.ailms.response.StudentCatalogCourseResponse;
import com.ailms.response.StudentDashboardResponse;
import com.ailms.response.StudentPortalItemResponse;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.CouponResponse;
import com.ailms.response.StudyGoalResponse;
import com.ailms.request.CreateStudyGoalRequest;
import com.ailms.request.UpdateStudyGoalRequest;
import com.ailms.request.OnboardingRequest;
import com.ailms.response.StudentProfileResponse;
import com.ailms.response.StudentPersonalizationResponse;
import com.ailms.response.UserCouponResponse;
import com.ailms.service.IStudentPortalService;
import com.ailms.service.IStudentLearningService;
import com.ailms.service.ICouponService;
import com.ailms.service.IStudyGoalService;
import com.ailms.service.IStudentProfileService;
import com.ailms.service.IOrderService;
import com.ailms.service.IApprovalRequestService;
import com.ailms.service.ICartService;
import com.ailms.request.RefundRequest;
import com.ailms.request.OneOnOneNeedsRequest;
import com.ailms.service.calculator.LearningStreakCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import tools.jackson.databind.ObjectMapper;

/** Triển khai các truy vấn tổng hợp chỉ đọc và lịch sử cho cổng học viên. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudentPortalService implements IStudentPortalService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final int UPCOMING_DAYS = 14;

    private final LearningActivityLogRepository learningActivityLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final CourseProgressRepository courseProgressRepository;
    private final StudyGoalRepository studyGoalRepository;
    private final LearningStreakCalculator learningStreakCalculator;
    private final CourseRepository courseRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final StudentInterestRepository studentInterestRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final SubmissionRepository submissionRepository;
    private final CertificateRepository certificateRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderRepository orderRepository;
    private final ClassOnlineRepository classOnlineRepository;
    private final LearningSessionRepository learningSessionRepository;
    private final IStudentLearningService studentLearningService;
    private final ICouponService couponService;
    private final IStudyGoalService studyGoalService;
    private final IStudentProfileService studentProfileService;
    private final IOrderService orderService;
    private final IApprovalRequestService approvalRequestService;
    private final ICartService cartService;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassRepository classRepository;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final ObjectMapper objectMapper;

    /** Lấy dữ liệu onboarding, mục tiêu học tập và chủ đề học viên quan tâm. */
    @Override
    public StudentPersonalizationResponse getPersonalization(Long userId) {
        StudentProfileResponse profile = studentProfileService.getById(userId);
        List<StudentPersonalizationResponse.InterestItem> interests = studentInterestRepository
                .findByStudentProfile_UserId(userId).stream()
                .filter(item -> item.getInterest() != null)
                .map(item -> StudentPersonalizationResponse.InterestItem.builder()
                        .id(item.getInterest().getId()).code(item.getInterest().getCode())
                        .name(item.getInterest().getName()).description(item.getInterest().getDescription())
                        .note(item.getNote()).build())
                .toList();
        return StudentPersonalizationResponse.builder().userId(userId)
                .educationLevel(profile.getEducationLevel()).goal(profile.getGoal())
                .description(profile.getDescription()).schoolName(profile.getSchoolName())
                .hasGoal(profile.getHasGoal()).studyGoals(getGoals(userId)).interests(interests).topics(interests).build();
    }

    /** Lấy lịch sử learning của chính học viên theo trang. */
    @Override
    public PageResponse<StudentActivityHistoryResponse> getLearningHistory(Long userId, int page, int size,
            String action, LocalDateTime from, LocalDateTime to) {
        Page<LearningActivityLogEntity> result = learningActivityLogRepository
                .searchByUserId(userId, normalizeFilter(action), from, to, pageRequest(page, size));
        return PageResponse.from(result.map(this::mapLearningHistory));
    }

    /** Lấy chi tiết lịch sử learning và kiểm tra quyền sở hữu. */
    @Override
    public StudentActivityHistoryResponse getLearningHistoryDetail(Long userId, Long id) {
        return mapLearningHistory(learningActivityLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("LearningActivityLog", id)));
    }

    /** Xóa lịch sử learning khi bản ghi thuộc chính học viên. */
    @Override
    @Transactional
    public void deleteLearningHistory(Long userId, Long id) {
        LearningActivityLogEntity entity = learningActivityLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("LearningActivityLog", id));
        learningActivityLogRepository.delete(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "LEARNING_ACTIVITY_LOG", id,
                mapLearningHistory(entity), null));
    }

    /** Lấy lịch sử thao tác hệ thống của chính học viên theo trang. */
    @Override
    public PageResponse<StudentActivityHistoryResponse> getSystemHistory(Long userId, int page, int size,
            String action, LocalDateTime from, LocalDateTime to) {
        Page<AuditLogEntity> result = auditLogRepository
                .searchByUserId(userId, normalizeFilter(action), from, to, pageRequest(page, size));
        return PageResponse.from(result.map(this::mapSystemHistory));
    }

    /** Lấy chi tiết lịch sử hệ thống và kiểm tra quyền sở hữu. */
    @Override
    public StudentActivityHistoryResponse getSystemHistoryDetail(Long userId, Long id) {
        return mapSystemHistory(auditLogRepository.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("AuditLog", id)));
    }

    /** Xóa lịch sử hệ thống khi bản ghi thuộc chính học viên. */
    @Override
    @Transactional
    public void deleteSystemHistory(Long userId, Long id) {
        AuditLogEntity entity = auditLogRepository.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("AuditLog", id));
        auditLogRepository.delete(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "AUDIT_LOG", id,
                mapSystemHistory(entity), null));
    }

    /** Tổng hợp streak, khóa học và bài tập đến hạn cho dashboard. */
    @Override
    public StudentDashboardResponse getDashboard(Long userId) {
        List<EnrollmentEntity> enrollments = enrollmentRepository.findByUserEntity_Id(userId);
        List<Long> courseIds = enrollments.stream().map(e -> e.getCourseEntity().getId()).distinct().toList();
        LocalDateTime now = LocalDateTime.now();
        List<AssignmentEntity> upcoming = courseIds.isEmpty() ? List.of()
                : assignmentRepository.findByCourseIdInAndDueDateBetweenOrderByDueDateAsc(
                        courseIds, now, now.plusDays(UPCOMING_DAYS));
        LearningStreakCalculator.StreakResult streak = learningStreakCalculator.calculate(userId, LocalDate.now());
        List<CourseProgressEntity> progress = courseProgressRepository.findByUserId(userId);
        BigDecimal averageScore = progress.stream().map(CourseProgressEntity::getAvgQuizScore)
                .filter(value -> value != null).reduce(BigDecimal.ZERO, BigDecimal::add);
        long scoredCourses = progress.stream().filter(value -> value.getAvgQuizScore() != null).count();
        if (scoredCourses > 0) averageScore = averageScore.divide(BigDecimal.valueOf(scoredCourses), 2, RoundingMode.HALF_UP);

        return StudentDashboardResponse.builder()
                .currentStreak(streak.currentStreak())
                .longestStreak(streak.longestStreak())
                .activeCoursesCount(enrollments.stream().filter(e -> Byte.valueOf((byte) 0).equals(e.getStatus())).count())
                .completedCoursesCount(enrollments.stream().filter(e -> Byte.valueOf((byte) 1).equals(e.getStatus())).count())
                .upcomingDeadlinesCount(upcoming.size())
                .averageQuizScore(averageScore)
                .hasSetGoals(studyGoalRepository.findByUserId(userId).stream().anyMatch(goal -> goal.getCourseId() == null))
                .upcomingAssignments(upcoming.stream().map(this::mapUpcomingAssignment).toList())
                .build();
    }

    /** Lấy catalog chỉ thuộc các danh mục khớp sở thích thật của học viên. */
    @Override
    public PageResponse<StudentCatalogCourseResponse> getCatalog(Long userId, int page, int size, String keyword) {
        List<Long> matchingCategoryIds = studentInterestRepository.findActiveCategoryIdsByStudentUserId(userId);
        if (matchingCategoryIds.isEmpty()) {
            return emptyCatalogPage(page, size);
        }
        Set<Long> enrolledCourseIds = getActiveCourseIds(userId);
        Page<CourseEntity> courses = courseRepository.findPersonalizedCoursesForSale(
                normalizeFilter(keyword), matchingCategoryIds, pageRequest(page, size));
        List<StudentCatalogCourseResponse> content = courses.getContent().stream()
                .map(course -> mapCatalogCourse(course, enrolledCourseIds, true))
                .toList();
        return PageResponse.<StudentCatalogCourseResponse>builder().content(content)
                .pageNumber(courses.getNumber()).pageSize(courses.getSize())
                .totalElements(courses.getTotalElements()).totalPages(courses.getTotalPages())
                .first(courses.isFirst()).last(courses.isLast()).build();
    }

    /** Lấy mọi khóa học có gói tự học đang hoạt động và đủ điều kiện bán công khai. */
    @Override
    public PageResponse<StudentCatalogCourseResponse> getAllCatalogCourses(
            Long userId, int page, int size, String keyword) {
        Set<Long> enrolledCourseIds = getActiveCourseIds(userId);
        Page<CourseEntity> courses = courseRepository.findActiveCoursesForSale(
                normalizeFilter(keyword), null, null, pageRequest(page, size));
        List<StudentCatalogCourseResponse> content = courses.getContent().stream()
                .map(course -> mapCatalogCourse(course, enrolledCourseIds, false)).toList();
        return PageResponse.<StudentCatalogCourseResponse>builder().content(content)
                .pageNumber(courses.getNumber()).pageSize(courses.getSize())
                .totalElements(courses.getTotalElements()).totalPages(courses.getTotalPages())
                .first(courses.isFirst()).last(courses.isLast()).build();
    }

    /** Lấy khóa học đã ghi danh và ghép tiến độ gần nhất. */
    @Override
    public List<StudentPortalItemResponse.CourseCard> getCourses(Long userId, String status) {
        String requestedStatus = normalizeFilter(status);
        if (requestedStatus != null) {
            requestedStatus = requestedStatus.toUpperCase(Locale.ROOT);
            if (!Set.of("ACTIVE", "COMPLETED", "EXPIRED").contains(requestedStatus)) {
                throw new IllegalArgumentException("Unsupported course status: " + status);
            }
        }
        final String statusFilter = requestedStatus;
        Map<Long, CourseProgressEntity> progressByEnrollment = courseProgressRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(CourseProgressEntity::getEnrollmentId, Function.identity(), (a, b) -> a));
        LocalDateTime now = LocalDateTime.now();
        return enrollmentRepository.findByUserEntity_Id(userId).stream().map(enrollment -> {
            List<EnrollmentPackageEntity> activePackages = enrollmentPackageRepository
                    .findActiveByEnrollment(enrollment.getId(), now);
            if (activePackages.isEmpty()) return null;
            CourseEntity course = enrollment.getCourseEntity();
            CourseProgressEntity progress = progressByEnrollment.get(enrollment.getId());
            LocalDateTime expiresAt = activePackages.stream().map(EnrollmentPackageEntity::getExpiresAt)
                    .filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(null);
            DeliveryModeEnum mode = activePackages.stream().map(item -> item.getCoursePackageEntity().getDeliveryMode())
                    .max(Comparator.comparingInt(this::deliveryPriority)).orElse(DeliveryModeEnum.SELF_STUDY);
            String enrollmentStatus = Byte.valueOf((byte) 1).equals(enrollment.getStatus()) ? "COMPLETED"
                    : Byte.valueOf((byte) 2).equals(enrollment.getStatus()) ? "EXPIRED" : "ACTIVE";
            return StudentPortalItemResponse.CourseCard.builder().id(course.getId()).title(course.getName())
                    .courseCode(course.getCode()).courseLink(course.getLink()).description(course.getDescription())
                    .level(course.getLevel() != null ? course.getLevel().name() : null)
                    .categoryName(course.getCategoryEntity() != null ? course.getCategoryEntity().getName() : null)
                    .coverImage(course.getThumbnailUrl())
                    .deliveryMode(mode).progressPercent(progress != null ? progress.getProgressPercent() : 0)
                    .expiresAt(expiresAt).expired("EXPIRED".equals(enrollmentStatus)).status(enrollmentStatus)
                    .lastAccessedAt(progress != null ? progress.getLastAccessedAt() : enrollment.getEnrolledAt()).build();
        }).filter(Objects::nonNull)
                .filter(card -> statusFilter == null || statusFilter.equals(card.getStatus())).toList();
    }

    /** Lấy curriculum sau khi xác nhận học viên sở hữu khóa học. */
    @Override
    public CourseCurriculumResponse getCourseDetail(Long userId, Long courseId) {
        enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(userId, courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("EnrollmentCourse", courseId));
        if (!enrollmentPackageRepository.existsActiveCourseAccess(userId, courseId, LocalDateTime.now())) {
            throw ResourceNotFoundException.of("ActiveEnrollmentPackage", courseId);
        }
        return studentLearningService.getCourseTree(courseId, userId);
    }

    /** Ưu tiên hình thức nhiều quyền lợi hơn khi một khóa học có nhiều package còn hiệu lực. */
    private int deliveryPriority(DeliveryModeEnum mode) {
        if (mode == DeliveryModeEnum.ONE_ON_ONE) return 4;
        if (mode == DeliveryModeEnum.COMBO) return 3;
        if (mode == DeliveryModeEnum.GROUP_CLASS) return 2;
        return 1;
    }

    /** Lấy các buổi học online tương lai thuộc lớp học đã ghi danh. */
    @Override
    public List<StudentPortalItemResponse.ScheduleItem> getSchedule(Long userId) {
        Set<Long> classIds = getActiveStudentClassIds(userId);
        Set<Long> courseIds = getActiveCourseIds(userId);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime horizon = now.plusMonths(3);
        List<StudentPortalItemResponse.ScheduleItem> result = new ArrayList<>();
        if (!classIds.isEmpty()) {
            result.addAll(classOnlineRepository.findStudentSchedule(
                    new ArrayList<>(classIds), now, horizon).stream().map(this::mapSchedule).toList());
        }
        result.addAll(findVisibleAssignmentDeadlines(courseIds, classIds, now, horizon).stream()
                .map(item -> StudentPortalItemResponse.ScheduleItem.builder().id(item.getId()).title(item.getTitle())
                        .type("ASSIGNMENT_DEADLINE").className(resolveClassName(item.getClassId()))
                        .startAt(item.getDueDate()).endAt(item.getDueDate()).build()).toList());
        result.addAll(findVisibleQuizDeadlines(courseIds, classIds, now, horizon).stream()
                .map(item -> StudentPortalItemResponse.ScheduleItem.builder().id(item.getId()).title(item.getTitle())
                        .type("QUIZ_DEADLINE").className(resolveClassName(item.getClassId()))
                        .startAt(item.getDueAt()).endAt(item.getDueAt()).build()).toList());
        return result.stream().sorted(Comparator.comparing(StudentPortalItemResponse.ScheduleItem::getStartAt)).toList();
    }

    /** Lấy bài tập và trạng thái bài nộp của học viên. */
    @Override
    public List<StudentPortalItemResponse.AssignmentItem> getAssignments(Long userId) {
        Set<Long> courseIds = getActiveCourseIds(userId);
        Set<Long> classIds = getActiveStudentClassIds(userId);
        Map<Long, SubmissionEntity> submissions = submissionRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(SubmissionEntity::getAssignmentId, Function.identity(), (a, b) -> a));
        List<AssignmentEntity> assignments = new ArrayList<>();
        if (!courseIds.isEmpty()) assignments.addAll(assignmentRepository
                .findByStatusAndClassIdIsNullAndCourseIdInOrderByDueDateAsc(
                        BaseStatusEnum.ACTIVE, new ArrayList<>(courseIds)));
        if (!classIds.isEmpty()) assignments.addAll(assignmentRepository
                .findByStatusAndClassIdInOrderByDueDateAsc(BaseStatusEnum.ACTIVE, new ArrayList<>(classIds)));
        return assignments.stream()
                .map(item -> mapAssignment(item, submissions.get(item.getId()))).toList();
    }

    /** Lấy quiz được giao và tổng hợp số lần làm, điểm cao nhất của học viên. */
    @Override
    public List<StudentPortalItemResponse.QuizItem> getQuizzes(Long userId) {
        Set<Long> courseIds = getActiveCourseIds(userId);
        Set<Long> classIds = getActiveStudentClassIds(userId);
        Map<Long, List<QuizAttemptEntity>> attempts = quizAttemptRepository.findByUserId(userId).stream()
                .collect(Collectors.groupingBy(QuizAttemptEntity::getQuizId));
        List<QuizEntity> quizzes = new ArrayList<>();
        if (!courseIds.isEmpty()) quizzes.addAll(quizRepository
                .findByStatusAndClassIdIsNullAndCourseIdInOrderByDueAtAsc(
                        BaseStatusEnum.ACTIVE, new ArrayList<>(courseIds)));
        if (!classIds.isEmpty()) quizzes.addAll(quizRepository
                .findByStatusAndClassIdInOrderByDueAtAsc(BaseStatusEnum.ACTIVE, new ArrayList<>(classIds)));
        return quizzes.stream()
                .map(item -> mapQuiz(item, attempts.getOrDefault(item.getId(), List.of()))).toList();
    }

    /** Lấy chứng chỉ thật đã cấp cho học viên. */
    @Override
    public List<StudentPortalItemResponse.CertificateItem> getCertificates(Long userId) {
        return certificateRepository.findByUserIdOrderByIssuedAtDesc(userId).stream().map(this::mapCertificate).toList();
    }

    /** Tổng hợp hoạt động 30 ngày và tiến độ từng khóa học. */
    @Override
    public StudentPortalItemResponse.ProgressAnalytics getProgress(Long userId) {
        LocalDate today = LocalDate.now();
        List<StudentPortalItemResponse.ActivityPoint> activities = IntStream.rangeClosed(0, 29)
                .mapToObj(offset -> today.minusDays(29L - offset)).map(date -> {
                    Long seconds = learningSessionRepository.sumActiveSecondsForUserInPeriod(userId,
                            date.atStartOfDay(), date.plusDays(1).atStartOfDay());
                    return StudentPortalItemResponse.ActivityPoint.builder().date(date)
                            .hoursSpent(BigDecimal.valueOf(seconds != null ? seconds : 0)
                                    .divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP)).build();
                }).toList();
        Map<LocalDate, Long> heatmap = learningActivityLogRepository.findActivityTimesByUserId(userId).stream()
                .filter(value -> !value.toLocalDate().isBefore(today.minusDays(29)))
                .collect(Collectors.groupingBy(LocalDateTime::toLocalDate, Collectors.counting()));
        List<StudentPortalItemResponse.CoursePoint> courses = courseProgressRepository.findByUserId(userId).stream()
                .map(progress -> StudentPortalItemResponse.CoursePoint.builder().courseId(progress.getCourseId())
                        .courseName(courseRepository.findById(progress.getCourseId()).map(CourseEntity::getName).orElse(null))
                        .progressPercent(progress.getProgressPercent()).averageQuizScore(progress.getAvgQuizScore()).build()).toList();
        return StudentPortalItemResponse.ProgressAnalytics.builder().activityLogs(activities).courseProgress(courses)
                .contributionHeatmap(heatmap.entrySet().stream().sorted(Map.Entry.comparingByKey())
                        .map(entry -> StudentPortalItemResponse.HeatmapPoint.builder().date(entry.getKey()).count(entry.getValue()).build()).toList())
                .build();
    }

    /** Lấy mục tiêu và các chỉ số streak đã đồng bộ. */
    @Override
    public List<StudentPortalItemResponse.GoalItem> getGoals(Long userId) {
        return studyGoalRepository.findByUserId(userId).stream()
                .filter(goal -> goal.getCourseId() == null).map(this::mapGoal).toList();
    }

    /** Tạo mục tiêu với userId lấy từ JWT thay vì request client. */
    @Override
    @Transactional
    public StudentPortalItemResponse.GoalItem createGoal(Long userId, CreateStudyGoalRequest request) {
        request.setUserId(userId);
        request.setCourseId(null);
        StudyGoalResponse created = studyGoalService.create(request);
        StudyGoalEntity entity = studyGoalRepository.findById(created.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("StudyGoal", created.getId()));
        return mapGoal(entity);
    }

    /** Cập nhật mục tiêu chung và chỉ cho phép sửa mục tiêu của chính học viên. */
    @Override
    @Transactional
    public StudentPortalItemResponse.GoalItem updateGoal(Long userId, Long goalId, UpdateStudyGoalRequest request) {
        StudyGoalEntity existing = studyGoalRepository.findById(goalId)
                .filter(goal -> userId.equals(goal.getUserId()) && goal.getCourseId() == null)
                .orElseThrow(() -> ResourceNotFoundException.of("StudentStudyGoal", goalId));
        request.setCourseId(null);
        request.setCurrentStreak(null);
        request.setLongestStreak(null);
        request.setStatus(null);
        StudyGoalResponse updated = studyGoalService.update(existing.getId(), request);
        return mapGoal(studyGoalRepository.findById(updated.getId())
                .orElseThrow(() -> ResourceNotFoundException.of("StudyGoal", updated.getId())));
    }

    /** Lấy các gói thật trong giỏ hàng của học viên. */
    @Override
    public List<StudentPortalItemResponse.CartItem> getCart(Long userId) {
        Set<Long> visibleCartItemIds = cartService.getCart(userId).stream()
                .map(item -> item.getId()).collect(Collectors.toSet());
        return cartItemRepository.findByUserEntity_Id(userId).stream()
                .filter(item -> visibleCartItemIds.contains(item.getId()))
                .map(this::mapCartItem).toList();
    }

    /** Thêm gói đang mở bán vào giỏ và không cho tạo dòng trùng. */
    @Override
    @Transactional
    public StudentPortalItemResponse.CartItem addToCart(
            Long userId, Long coursePackageId, OneOnOneNeedsRequest needs) {
        Long cartItemId = cartService.addToCart(userId, coursePackageId, needs).getId();
        return cartItemRepository.findById(cartItemId).map(this::mapCartItem)
                .orElseThrow(() -> ResourceNotFoundException.of("StudentCartItem", cartItemId));
    }

    /** Xóa dòng giỏ hàng sau khi xác nhận đúng chủ sở hữu. */
    @Override
    @Transactional
    public void removeFromCart(Long userId, Long cartItemId) {
        cartService.removeFromCart(userId, cartItemId);
    }

    /** Lấy đúng các voucher đã được cấp cho học viên. */
    @Override
    public List<UserCouponResponse> getVouchers(Long userId) {
        return couponService.getUserCoupons(userId);
    }

    /** Kiểm tra coupon và tính giảm giá trên tổng giỏ hàng phù hợp. */
    @Override
    public StudentPortalItemResponse.CouponValidation validateCoupon(
            Long userId, String code, List<Long> coursePackageIds) {
        Set<Long> selectedIds = coursePackageIds == null ? Set.of() : Set.copyOf(coursePackageIds);
        List<CartItemEntity> cartItems = cartItemRepository.findByUserEntity_Id(userId).stream()
                .filter(item -> selectedIds.isEmpty()
                        || selectedIds.contains(item.getCoursePackageEntity().getId())).toList();
        if (cartItems.isEmpty()) throw new IllegalArgumentException("Vui lòng chọn ít nhất một gói học để áp dụng voucher.");
        List<Long> courseIds = cartItems.stream().map(item -> item.getCoursePackageEntity().getCourseEntity().getId())
                .distinct().toList();
        UserCouponResponse coupon = couponService.validateUserCoupon(userId, code, courseIds);
        Long applicableCourseId = coupon.getApplicableCourseId();
        BigDecimal subtotal = cartItems.stream()
                .filter(item -> applicableCourseId == null
                        || item.getCoursePackageEntity().getCourseEntity().getId().equals(applicableCourseId))
                .map(item -> item.getCoursePackageEntity().getPrice()).filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discount = coupon.getDiscountType().name().equals("PERCENT")
                ? subtotal.multiply(coupon.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : coupon.getDiscountValue().min(subtotal);
        return StudentPortalItemResponse.CouponValidation.builder().valid(true).discountAmount(discount)
                .message("Coupon hợp lệ").build();
    }

    /** Lấy đơn hàng và chi tiết gói mua của học viên. */
    @Override
    public List<StudentPortalItemResponse.OrderItem> getOrders(Long userId) {
        return orderRepository.findByUserEntity_Id(userId).stream()
                .sorted(Comparator.comparing(OrderEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::mapOrder).toList();
    }

    /** Hoàn tất onboarding và áp chủ sở hữu từ JWT cho cả profile lẫn goal. */
    @Override
    @Transactional
    public StudentProfileResponse completeOnboarding(Long userId, OnboardingRequest request) {
        request.setUserId(userId);
        if (request.getGoal() != null) request.getGoal().setUserId(userId);
        return studentProfileService.completeOnboarding(request);
    }

    /** Xác nhận đơn thuộc học viên rồi tạo yêu cầu chờ HR/Admin duyệt, chưa hoàn tiền ngay. */
    @Override
    @Transactional
    public void refundOrder(Long userId, Long orderId, RefundRequest request) {
        orderRepository.findById(orderId).filter(order -> order.getUserEntity().getId().equals(userId))
                .orElseThrow(() -> ResourceNotFoundException.of("StudentOrder", orderId));
        approvalRequestService.createRefundRequest(orderId, request);
    }

    /** Chuẩn hóa tham số phân trang và giới hạn kích thước truy vấn. */
    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
    }

    /** Chuyển buổi học online sang lịch học viên. */
    private StudentPortalItemResponse.ScheduleItem mapSchedule(ClassOnlineEntity item) {
        LocalDateTime endAt = item.getScheduledAt() != null && item.getDurationMin() != null
                ? item.getScheduledAt().plusMinutes(item.getDurationMin()) : null;
        return StudentPortalItemResponse.ScheduleItem.builder().id(item.getId()).title(item.getTitle()).type("ONLINE_CLASS")
                .className(item.getClassEntity().getName())
                .teacherName(item.getTeacherEntity() != null ? item.getTeacherEntity().getFullName() : null)
                .startAt(item.getScheduledAt()).endAt(endAt).roomUrl(item.getMeetingUrl()).build();
    }

    /** Chuyển bài tập và bài nộp thành trạng thái hiển thị của học viên. */
    private StudentPortalItemResponse.AssignmentItem mapAssignment(AssignmentEntity item, SubmissionEntity submission) {
        String status = submission == null ? (item.getDueDate() != null && item.getDueDate().isBefore(LocalDateTime.now()) ? "LATE" : "NOT_STARTED")
                : submission.getGradedAt() != null ? "GRADED" : "SUBMITTED";
        return StudentPortalItemResponse.AssignmentItem.builder().id(item.getId()).title(item.getTitle())
                .courseId(item.getCourseId()).classId(item.getClassId())
                .courseName(courseRepository.findById(item.getCourseId()).map(CourseEntity::getName).orElse(null))
                .dueDate(item.getDueDate()).status(status).score(submission != null ? submission.getScore() : null)
                .maxScore(item.getMaxScore()).feedback(submission != null ? submission.getFeedback() : null).build();
    }

    /** Chuyển quiz và lịch sử attempts thành trạng thái cần làm của học viên. */
    private StudentPortalItemResponse.QuizItem mapQuiz(QuizEntity quiz, List<QuizAttemptEntity> attempts) {
        BigDecimal bestScore = attempts.stream().map(QuizAttemptEntity::getScore).filter(Objects::nonNull)
                .max(BigDecimal::compareTo).orElse(null);
        boolean passed = attempts.stream().anyMatch(item -> Boolean.TRUE.equals(item.getIsPassed()));
        String status = passed ? "PASSED" : quiz.getDueAt() != null && quiz.getDueAt().isBefore(LocalDateTime.now())
                ? "EXPIRED" : attempts.stream().anyMatch(item -> Byte.valueOf((byte) 0).equals(item.getStatus()))
                ? "IN_PROGRESS" : attempts.isEmpty() ? "NOT_STARTED" : "SUBMITTED";
        return StudentPortalItemResponse.QuizItem.builder().id(quiz.getId()).title(quiz.getTitle())
                .courseId(quiz.getCourseId()).classId(quiz.getClassId())
                .courseName(courseRepository.findById(quiz.getCourseId()).map(CourseEntity::getName).orElse(null))
                .dueAt(quiz.getDueAt()).timeLimitMin(quiz.getTimeLimitMin()).maxAttempts(quiz.getMaxAttempts())
                .status(status).attemptsUsed(attempts.size()).bestScore(bestScore).passed(passed).build();
    }

    /** Lấy ID các lớp mà học viên đang là thành viên ACTIVE. */
    private Set<Long> getActiveStudentClassIds(Long userId) {
        Set<Long> activeCourseIds = getActiveCourseIds(userId);
        return classMemberRepository.findById_UserId(userId).stream()
                .filter(item -> item.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(item -> item.getRoleInClass() == ClassMemberRole.STUDENT)
                .filter(item -> item.getClassEntity().getCourseEntity() != null
                        && activeCourseIds.contains(item.getClassEntity().getCourseEntity().getId()))
                .map(item -> item.getClassEntity().getId()).collect(Collectors.toSet());
    }

    /** Lấy khóa học đang sở hữu từ package ACTIVE thay vì enrollment lịch sử. */
    private Set<Long> getActiveCourseIds(Long userId) {
        return new HashSet<>(enrollmentPackageRepository.findActiveCourseIdsByUser(userId, LocalDateTime.now()));
    }

    /** Truy vấn deadline assignment trong SQL theo đúng khóa học/lớp và khoảng thời gian. */
    private List<AssignmentEntity> findVisibleAssignmentDeadlines(
            Set<Long> courseIds, Set<Long> classIds, LocalDateTime from, LocalDateTime to) {
        List<AssignmentEntity> result = new ArrayList<>();
        if (!courseIds.isEmpty()) result.addAll(assignmentRepository
                .findByStatusAndClassIdIsNullAndCourseIdInAndDueDateBetweenOrderByDueDateAsc(
                        BaseStatusEnum.ACTIVE, new ArrayList<>(courseIds), from, to));
        if (!classIds.isEmpty()) result.addAll(assignmentRepository
                .findByStatusAndClassIdInAndDueDateBetweenOrderByDueDateAsc(
                        BaseStatusEnum.ACTIVE, new ArrayList<>(classIds), from, to));
        return result;
    }

    /** Truy vấn deadline quiz trong SQL theo đúng khóa học/lớp và khoảng thời gian. */
    private List<QuizEntity> findVisibleQuizDeadlines(
            Set<Long> courseIds, Set<Long> classIds, LocalDateTime from, LocalDateTime to) {
        List<QuizEntity> result = new ArrayList<>();
        if (!courseIds.isEmpty()) result.addAll(quizRepository
                .findByStatusAndClassIdIsNullAndCourseIdInAndDueAtBetweenOrderByDueAtAsc(
                        BaseStatusEnum.ACTIVE, new ArrayList<>(courseIds), from, to));
        if (!classIds.isEmpty()) result.addAll(quizRepository
                .findByStatusAndClassIdInAndDueAtBetweenOrderByDueAtAsc(
                        BaseStatusEnum.ACTIVE, new ArrayList<>(classIds), from, to));
        return result;
    }

    /** Chỉ hiển thị nội dung chung khóa học hoặc nội dung của đúng lớp học viên. */
    private boolean isLearningItemVisible(
            Long courseId, Long classId, Set<Long> courseIds, Set<Long> classIds) {
        return classId != null ? classIds.contains(classId) : courseId != null && courseIds.contains(courseId);
    }

    /** Tra tên lớp cho mục lịch nếu nội dung được giao theo lớp. */
    private String resolveClassName(Long classId) {
        return classId == null ? null : classRepository.findById(classId).map(ClassEntity::getName).orElse(null);
    }

    /** Chuyển chứng chỉ sang DTO và bổ sung tên khóa học. */
    private StudentPortalItemResponse.CertificateItem mapCertificate(CertificateEntity item) {
        return StudentPortalItemResponse.CertificateItem.builder().id(item.getId()).certificateCode(item.getCertificateCode())
                .courseId(item.getCourseId()).courseName(courseRepository.findById(item.getCourseId()).map(CourseEntity::getName).orElse(null))
                .issuedAt(item.getIssuedAt()).status(item.getStatus() != null ? item.getStatus().name() : null)
                .downloadUrl(item.getDownloadUrl()).build();
    }

    /** Chuyển mục tiêu học tập sang DTO của cổng học viên. */
    private StudentPortalItemResponse.GoalItem mapGoal(StudyGoalEntity item) {
        int currentValue = item.getStudyGoalTypeEnum() != null && item.getStudyGoalTypeEnum().name().equals("DAILY_STREAK")
                ? (item.getCurrentStreak() != null ? item.getCurrentStreak() : 0) : 0;
        return StudentPortalItemResponse.GoalItem.builder().id(item.getId()).studyGoalTypeEnum(item.getStudyGoalTypeEnum())
                .targetValue(item.getTargetValue()).courseId(item.getCourseId()).currentValue(currentValue)
                .currentStreak(item.getCurrentStreak()).longestStreak(item.getLongestStreak()).status(item.getStatus()).build();
    }

    /** Chuyển cart item và quan hệ package/course sang DTO. */
    private StudentPortalItemResponse.CartItem mapCartItem(CartItemEntity item) {
        CoursePackageEntity pack = item.getCoursePackageEntity();
        return StudentPortalItemResponse.CartItem.builder().id(item.getId()).coursePackageId(pack.getId())
                .courseId(pack.getCourseEntity().getId()).courseTitle(pack.getCourseEntity().getName()).packageName(pack.getName())
                .deliveryMode(pack.getDeliveryMode()).price(pack.getPrice())
                .requiresTutorNeeds(pack.getDeliveryMode() == DeliveryModeEnum.ONE_ON_ONE
                        || (pack.getDeliveryMode() == DeliveryModeEnum.COMBO
                        && pack.getIncludedTutorSessions() != null && pack.getIncludedTutorSessions() > 0))
                .oneOnOneNeeds(deserializeCartNeeds(item.getOneOnOneNeeds())).build();
    }

    /** Khôi phục draft nhu cầu 1-1 từ cart item cho checkout. */
    private OneOnOneNeedsRequest deserializeCartNeeds(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return objectMapper.readValue(value, OneOnOneNeedsRequest.class);
        } catch (Exception exception) {
            throw new BusinessException("Bản nháp nhu cầu học tập 1-1 không hợp lệ.");
        }
    }

    /** Chuyển đơn hàng cùng các dòng sản phẩm sang DTO. */
    private StudentPortalItemResponse.OrderItem mapOrder(OrderEntity item) {
        return StudentPortalItemResponse.OrderItem.builder().id(item.getId())
                .items(item.getItems().stream().map(line -> StudentPortalItemResponse.OrderLine.builder()
                        .courseName(line.getCoursePackageEntity().getCourseEntity().getName())
                        .packageName(line.getCoursePackageEntity().getName()).price(line.getPriceSnapshot()).build()).toList())
                .totalAmount(item.getTotalAmount()).discountAmount(item.getDiscountAmount()).finalAmount(item.getFinalAmount())
                .couponCode(item.getCouponCode()).status(item.getStatus()).createdAt(item.getCreatedAt()).expiredAt(item.getExpiredAt())
                .eligibleForRefund(item.getStatus() == OrderStatusEnum.PAID && item.getPaidAt() != null
                        && item.getPaidAt().isAfter(LocalDateTime.now().minusDays(7))).build();
    }

    /** Chuyển learning log sang response không chứa dữ liệu người dùng khác. */
    private StudentActivityHistoryResponse mapLearningHistory(LearningActivityLogEntity entity) {
        return StudentActivityHistoryResponse.builder().id(entity.getId()).historyType("LEARNING")
                .action(entity.getEventType()).entityType(entity.getEntityType()).entityId(entity.getEntityId())
                .entityName(resolveEntityName(entity.getEntityType(), entity.getEntityId()))
                .metadata(entity.getMetadata()).device(entity.getDevice()).occurredAt(entity.getOccurredAt()).build();
    }

    /** Chuyển audit log sang response và không lộ old/new value có thể nhạy cảm. */
    private StudentActivityHistoryResponse mapSystemHistory(AuditLogEntity entity) {
        return StudentActivityHistoryResponse.builder().id(entity.getId()).historyType("SYSTEM")
                .action(entity.getAction()).entityType(entity.getEntityType()).entityId(entity.getEntityId())
                .entityName(resolveEntityName(entity.getEntityType(), entity.getEntityId()))
                .ipAddress(entity.getIpAddress()).userAgent(entity.getUserAgent()).occurredAt(entity.getOccurredAt()).build();
    }

    /** Tra tên hiển thị của đối tượng trong log theo entity type và entity id. */
    private String resolveEntityName(String entityType, Long entityId) {
        if (entityType == null || entityId == null) return null;
        return switch (entityType.toUpperCase(Locale.ROOT)) {
            case "COURSE" -> courseRepository.findById(entityId).map(CourseEntity::getName).orElse(null);
            case "LESSON" -> lessonRepository.findById(entityId).map(item -> item.getName()).orElse(null);
            case "QUIZ" -> quizRepository.findById(entityId).map(item -> item.getTitle()).orElse(null);
            case "ASSIGNMENT" -> assignmentRepository.findById(entityId).map(AssignmentEntity::getTitle).orElse(null);
            case "COURSE_PACKAGE" -> coursePackageRepository.findById(entityId).map(CoursePackageEntity::getName).orElse(null);
            case "STUDY_GOAL" -> "Mục tiêu học tập";
            default -> null;
        };
    }

    /** Chuẩn hóa bộ lọc hành động rỗng thành null để truy vấn bỏ qua điều kiện. */
    private String normalizeFilter(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Chuyển bài tập thành mục deadline rút gọn cho dashboard. */
    private StudentDashboardResponse.UpcomingAssignment mapUpcomingAssignment(AssignmentEntity assignment) {
        CourseEntity course = courseRepository.findById(assignment.getCourseId()).orElse(null);
        return StudentDashboardResponse.UpcomingAssignment.builder().id(assignment.getId())
                .courseId(assignment.getCourseId()).courseName(course != null ? course.getName() : null)
                .title(assignment.getTitle()).dueDate(assignment.getDueDate())
                .urgent(assignment.getDueDate() != null && assignment.getDueDate().isBefore(LocalDateTime.now().plusDays(3)))
                .build();
    }

    /** Chuyển khóa học và các gói đang bán thành card catalog. */
    private StudentCatalogCourseResponse mapCatalogCourse(CourseEntity course, Set<Long> enrolledIds, boolean personalized) {
        List<CoursePackageEntity> packages = coursePackageRepository.findByCourseEntity_Id(course.getId()).stream()
                .filter(item -> item.getStatus() == CoursePackageStatusEnum.ACTIVE).toList();
        BigDecimal originalPrice = packages.stream().map(CoursePackageEntity::getOriginalPrice).filter(v -> v != null)
                .min(BigDecimal::compareTo).orElse(course.getSuggestedPrice());
        BigDecimal sellingPrice = packages.stream().map(CoursePackageEntity::getPrice).filter(v -> v != null)
                .min(BigDecimal::compareTo).orElse(course.getSuggestedPrice());
        return StudentCatalogCourseResponse.builder().id(course.getId()).title(course.getName())
                .categoryName(course.getCategoryEntity() != null ? course.getCategoryEntity().getName() : null)
                .description(course.getDescription()).thumbnailUrl(course.getThumbnailUrl())
                .rating(course.getAvgRating() != null ? course.getAvgRating() : 0)
                .reviewCount(course.getReviewCount() != null ? course.getReviewCount() : 0)
                .enrollmentCount(course.getEnrollmentCount() != null ? course.getEnrollmentCount() : 0)
                .originalPrice(originalPrice).sellingPrice(sellingPrice).enrolled(enrolledIds.contains(course.getId()))
                .personalized(personalized).packages(packages.stream().map(this::mapPackage).toList()).build();
    }

    /** Chuyển gói học sang response và giữ nguyên delivery mode của backend. */
    private StudentCatalogCourseResponse.PackageItem mapPackage(CoursePackageEntity item) {
        return StudentCatalogCourseResponse.PackageItem.builder().id(item.getId()).name(item.getName())
                .deliveryMode(item.getDeliveryMode()).price(item.getPrice()).build();
    }

    /** Tạo trang rỗng khi học viên chưa có sở thích hoặc không có danh mục phù hợp. */
    private PageResponse<StudentCatalogCourseResponse> emptyCatalogPage(int page, int size) {
        return PageResponse.<StudentCatalogCourseResponse>builder().content(List.of())
                .pageNumber(Math.max(page, 0)).pageSize(Math.min(Math.max(size, 1), MAX_PAGE_SIZE))
                .totalElements(0).totalPages(0).first(true).last(true).build();
    }

}
