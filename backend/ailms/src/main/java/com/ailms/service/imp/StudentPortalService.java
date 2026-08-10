package com.ailms.service.imp;

import com.ailms.entity.AssignmentEntity;
import com.ailms.entity.AuditLogEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.CourseProgressEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.entity.StudentInterestEntity;
import com.ailms.entity.SubmissionEntity;
import com.ailms.entity.CertificateEntity;
import com.ailms.entity.CartItemEntity;
import com.ailms.entity.OrderEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.OrderStatusEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.event.AuditLogEvent;
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
import com.ailms.repository.UserRepository;
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
import com.ailms.service.IStudentPortalService;
import com.ailms.service.IStudentLearningService;
import com.ailms.service.ICouponService;
import com.ailms.service.IStudyGoalService;
import com.ailms.service.IStudentProfileService;
import com.ailms.service.IOrderService;
import com.ailms.request.RefundRequest;
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
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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
    private final UserRepository userRepository;
    private final IStudentProfileService studentProfileService;
    private final IOrderService orderService;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;

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

    /** Lấy catalog ưu tiên sở thích, sau đó giữ thứ tự phổ biến từ repository. */
    @Override
    public PageResponse<StudentCatalogCourseResponse> getCatalog(Long userId, int page, int size, String keyword) {
        List<StudentInterestEntity> interests = studentInterestRepository.findByStudentProfile_UserId(userId);
        Set<String> keywords = new HashSet<>();
        interests.forEach(item -> {
            keywords.add(normalize(item.getInterest().getName()));
            keywords.add(normalize(item.getInterest().getCode()));
        });
        Set<Long> enrolledCourseIds = enrollmentRepository.findByUserEntity_Id(userId).stream()
                .map(item -> item.getCourseEntity().getId()).collect(java.util.stream.Collectors.toSet());
        Page<CourseEntity> courses = courseRepository.findActiveCoursesForSale(normalizeFilter(keyword), pageRequest(page, size));
        List<StudentCatalogCourseResponse> content = courses.getContent().stream()
                .sorted(Comparator.comparing((CourseEntity course) -> !matchesInterest(course, keywords)))
                .map(course -> mapCatalogCourse(course, enrolledCourseIds, matchesInterest(course, keywords)))
                .toList();
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
        return enrollmentRepository.findByUserEntity_Id(userId).stream().map(enrollment -> {
            CourseEntity course = enrollment.getCourseEntity();
            CourseProgressEntity progress = progressByEnrollment.get(enrollment.getId());
            LocalDateTime expiresAt = enrollment.getClassEntity() != null ? enrollment.getClassEntity().getEndDate() : null;
            DeliveryModeEnum mode = enrollment.getClassEntity() != null
                    ? enrollment.getClassEntity().getPackageType() : DeliveryModeEnum.SELF_STUDY;
            String enrollmentStatus = Byte.valueOf((byte) 1).equals(enrollment.getStatus()) ? "COMPLETED"
                    : Byte.valueOf((byte) 2).equals(enrollment.getStatus()) ? "EXPIRED" : "ACTIVE";
            return StudentPortalItemResponse.CourseCard.builder().id(course.getId()).title(course.getName())
                    .courseCode(course.getCode()).courseLink(course.getLink()).description(course.getDescription())
                    .level(course.getLevel() != null ? course.getLevel().name() : null)
                    .categoryName(course.getCategoryEntity() != null ? course.getCategoryEntity().getName() : null)
                    .deliveryMode(mode).progressPercent(progress != null ? progress.getProgressPercent() : 0)
                    .expiresAt(expiresAt).expired("EXPIRED".equals(enrollmentStatus)).status(enrollmentStatus)
                    .lastAccessedAt(progress != null ? progress.getLastAccessedAt() : enrollment.getEnrolledAt()).build();
        }).filter(card -> statusFilter == null || statusFilter.equals(card.getStatus())).toList();
    }

    /** Lấy curriculum sau khi xác nhận học viên sở hữu khóa học. */
    @Override
    public CourseCurriculumResponse getCourseDetail(Long userId, Long courseId) {
        enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(userId, courseId)
                .orElseThrow(() -> ResourceNotFoundException.of("EnrollmentCourse", courseId));
        return studentLearningService.getCourseTree(courseId, userId);
    }

    /** Lấy các buổi học online tương lai thuộc lớp học đã ghi danh. */
    @Override
    public List<StudentPortalItemResponse.ScheduleItem> getSchedule(Long userId) {
        Set<Long> classIds = enrollmentRepository.findByUserEntity_Id(userId).stream()
                .map(EnrollmentEntity::getClassEntity).filter(value -> value != null)
                .map(value -> value.getId()).collect(Collectors.toSet());
        if (classIds.isEmpty()) return List.of();
        LocalDateTime now = LocalDateTime.now();
        return classOnlineRepository.findByScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(
                        now, now.plusMonths(3)).stream().filter(item -> classIds.contains(item.getClassEntity().getId()))
                .map(this::mapSchedule).toList();
    }

    /** Lấy bài tập và trạng thái bài nộp của học viên. */
    @Override
    public List<StudentPortalItemResponse.AssignmentItem> getAssignments(Long userId) {
        Set<Long> courseIds = enrollmentRepository.findByUserEntity_Id(userId).stream()
                .map(item -> item.getCourseEntity().getId()).collect(Collectors.toSet());
        Map<Long, SubmissionEntity> submissions = submissionRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(SubmissionEntity::getAssignmentId, Function.identity(), (a, b) -> a));
        return assignmentRepository.findAll().stream().filter(item -> courseIds.contains(item.getCourseId()))
                .sorted(Comparator.comparing(AssignmentEntity::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(item -> mapAssignment(item, submissions.get(item.getId()))).toList();
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
        List<StudentPortalItemResponse.ActivityPoint> activities = java.util.stream.IntStream.rangeClosed(0, 29)
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
        return cartItemRepository.findByUserEntity_Id(userId).stream().map(this::mapCartItem).toList();
    }

    /** Thêm gói đang mở bán vào giỏ và không cho tạo dòng trùng. */
    @Override
    @Transactional
    public StudentPortalItemResponse.CartItem addToCart(Long userId, Long coursePackageId) {
        if (cartItemRepository.existsByUserEntity_IdAndCoursePackageEntity_Id(userId, coursePackageId)) {
            throw new com.ailms.exception.DuplicateResourceException("Course package already exists in cart");
        }
        CoursePackageEntity pack = coursePackageRepository.findById(coursePackageId)
                .filter(item -> item.getStatus() == CoursePackageStatusEnum.ACTIVE)
                .orElseThrow(() -> ResourceNotFoundException.of("ActiveCoursePackage", coursePackageId));
        CartItemEntity saved = cartItemRepository.save(CartItemEntity.builder()
                .userEntity(userRepository.findById(userId).orElseThrow(() -> ResourceNotFoundException.of("User", userId)))
                .coursePackageEntity(pack).build());
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "CART_ITEM", saved.getId(), null,
                mapCartItem(saved)));
        return mapCartItem(saved);
    }

    /** Kiểm tra coupon và tính giảm giá trên tổng giỏ hàng phù hợp. */
    @Override
    public StudentPortalItemResponse.CouponValidation validateCoupon(Long userId, String code, Long courseId) {
        CouponResponse coupon = couponService.validateCoupon(code, courseId);
        BigDecimal subtotal = cartItemRepository.findByUserEntity_Id(userId).stream()
                .filter(item -> courseId == null || item.getCoursePackageEntity().getCourseEntity().getId().equals(courseId))
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

    /** Xác nhận đơn thuộc học viên trước khi chuyển nghiệp vụ hoàn tiền cho OrderService. */
    @Override
    @Transactional
    public void refundOrder(Long userId, Long orderId, RefundRequest request) {
        orderRepository.findById(orderId).filter(order -> order.getUserEntity().getId().equals(userId))
                .orElseThrow(() -> ResourceNotFoundException.of("StudentOrder", orderId));
        orderService.refundOrder(orderId, request);
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
                .courseId(item.getCourseId()).courseName(courseRepository.findById(item.getCourseId()).map(CourseEntity::getName).orElse(null))
                .dueDate(item.getDueDate()).status(status).score(submission != null ? submission.getScore() : null)
                .maxScore(item.getMaxScore()).feedback(submission != null ? submission.getFeedback() : null).build();
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
                .courseTitle(pack.getCourseEntity().getName()).packageName(pack.getName())
                .deliveryMode(pack.getDeliveryMode()).price(pack.getPrice()).build();
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
                .description(course.getDescription()).rating(course.getAvgRating() != null ? course.getAvgRating() : 0)
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

    /** Kiểm tra danh mục khóa học có khớp sở thích đã khai báo hay không. */
    private boolean matchesInterest(CourseEntity course, Set<String> keywords) {
        if (keywords.isEmpty() || course.getCategoryEntity() == null) return false;
        String category = normalize(course.getCategoryEntity().getName());
        return keywords.stream().anyMatch(keyword -> !keyword.isBlank()
                && (category.contains(keyword) || keyword.contains(category)));
    }

    /** Chuẩn hóa chuỗi phục vụ so khớp sở thích không phân biệt hoa thường. */
    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace('_', ' ');
    }
}
