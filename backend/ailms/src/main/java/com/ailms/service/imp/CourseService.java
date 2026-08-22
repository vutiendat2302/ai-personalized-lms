package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.common.util.CodeGenerator;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassMapper;
import com.ailms.mapper.CourseMapper;
import com.ailms.repository.*;
import com.ailms.repository.specification.CourseSpecification;
import com.ailms.request.*;
import com.ailms.response.ClassResponse;
import com.ailms.response.CourseResponse;
import com.ailms.response.CourseMetricResponse;
import com.ailms.response.PageResponse;
import com.ailms.request.BaseSearchRequest;
import com.ailms.service.ICourseService;
import com.ailms.service.INotificationService;
import com.ailms.search.MeilisearchCourseService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseService implements ICourseService {

    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final TeacherCategoryRepository teacherCategoryRepository;
    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final UserRepository userRepository;
    private final CourseMapper courseMapper;
    private final ClassMapper classMapper;
    private final INotificationService notificationService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final EnrollmentRepository enrollmentRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final UserRoleRepository userRoleRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final QuizRepository quizRepository;
    private final AssignmentRepository assignmentRepository;
    private final ReviewRepository reviewRepository;
    private final MeilisearchCourseService meilisearchCourseService;
    private final PublicCatalogVectorService publicCatalogVectorService;
    @Value("${public-catalog.vector-startup-sync:false}")
    private boolean vectorStartupSync;

    private static final String RESOURCE_NAME = "Course";
    private static final String CODE_PREFIX = "KH";

    @Override
    public List<CourseResponse> getAll() {
        log.info("Getting all courses");
        return courseRepository.findAll()
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional
    @Override
    public CourseResponse create(CreateCourseRequest request) {
        log.info("Creating course with name: {}", request.getName());

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.of("Category", request.getCategoryId()));

        if (courseRepository.existsByNameIgnoreCaseAndCategoryEntity_Id(request.getName(), request.getCategoryId())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "Category ID and name", request.getName());
        }

        CourseEntity entity = prepareCourse(request, category, CourseStatusEnum.DRAFT);

        CourseEntity savedEntity = courseRepository.save(entity);
        meilisearchCourseService.index(savedEntity, false);
        publicCatalogVectorService.indexCourse(savedEntity);
        Long creatorId = savedEntity.getCreatedBy();
        if (creatorId != null && userRoleRepository.hasActiveTeacherRole(creatorId, LocalDateTime.now())) {
            assignCreatorAsCourseTeacher(savedEntity, creatorId);
        }
        
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "COURSE", savedEntity.getId(), null, savedEntity));
        return courseMapper.toResponse(savedEntity);
    }

    @Transactional
    @Override
    public CourseResponse createCourseByTeacher(Long teacherUserId, CreateCourseRequest request) {
        log.info("Teacher {} creating course with name: {}", teacherUserId, request.getName());

        // Verify teacher belongs to category with status ACTIVE
        boolean isAssigned = teacherCategoryRepository.findByEmployee_UserIdAndCategory_Id(teacherUserId, request.getCategoryId())
                .map(tc -> tc.getStatus() == BaseStatusEnum.ACTIVE)
                .orElse(false);

        if (!isAssigned) {
            throw new BusinessException("Teacher must be assigned to active category " + request.getCategoryId() + " to create courses in it.");
        }

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.of("Category", request.getCategoryId()));

        CourseEntity entity = prepareCourse(request, category, CourseStatusEnum.DRAFT);
        entity.setCreatedBy(teacherUserId);

        CourseEntity savedEntity = courseRepository.save(entity);
        meilisearchCourseService.index(savedEntity, false);
        publicCatalogVectorService.indexCourse(savedEntity);
        if (userRoleRepository.hasActiveTeacherRole(teacherUserId, LocalDateTime.now())) {
            assignCreatorAsCourseTeacher(savedEntity, teacherUserId);
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_BY_TEACHER", "COURSE", savedEntity.getId(), null, savedEntity));
        return courseMapper.toResponse(savedEntity);
    }

    private void assignCreatorAsCourseTeacher(CourseEntity course, Long userId) {
        if (userId == null) return;
        userRepository.findById(userId).ifPresent(user -> {
            CourseTeacherId teacherId = new CourseTeacherId(course.getId(), user.getId());
            if (!courseTeacherRepository.existsById(teacherId)) {
                CourseTeacherEntity courseTeacher = CourseTeacherEntity.builder()
                        .id(teacherId)
                        .courseEntity(course)
                        .userEntity(user)
                        .assignedAt(LocalDateTime.now())
                        .assignedBy(userId)
                        .build();
                courseTeacherRepository.save(courseTeacher);
            }
        });
    }

    @Transactional
    @Override
    public CourseResponse update(Long id, UpdateCourseRequest request) {
        log.info("Updating course with id: {}", id);

        CourseEntity existingEntity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (existingEntity.getStatus() != CourseStatusEnum.DRAFT
                && existingEntity.getStatus() != CourseStatusEnum.REJECTED) {
            throw new BusinessException("Chỉ được cập nhật nội dung khóa học ở trạng thái DRAFT hoặc REJECTED.");
        }

        courseMapper.updateEntityFromRequest(request, existingEntity);
        if (StringUtils.hasText(request.getLink()) || StringUtils.hasText(request.getName())) {
            existingEntity.setLink(resolveLink(
                    request.getLink(),
                    StringUtils.hasText(request.getName()) ? request.getName() : existingEntity.getName()));
        }

        CourseEntity updatedEntity = courseRepository.save(existingEntity);
        meilisearchCourseService.index(updatedEntity, hasActivePackage(updatedEntity));
        publicCatalogVectorService.indexCourse(updatedEntity);
        deactivatePackagesIfCourseNotActive(updatedEntity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "COURSE", id, null, updatedEntity));
        return courseMapper.toResponse(updatedEntity);
    }

    @Transactional
    @Override
    public CourseResponse updateStatus(Long id, CourseStatusRequest request) {
        log.info("Updating status for course id: {}", id);

        CourseEntity existingEntity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (request.getStatus() == CourseStatusEnum.PENDING || request.getStatus() == CourseStatusEnum.REJECTED) {
            throw new BusinessException("Trạng thái duyệt khóa học chỉ được thay đổi qua quy trình phê duyệt.");
        }
        if (request.getStatus() == CourseStatusEnum.ACTIVE) {
            if (existingEntity.getStatus() != CourseStatusEnum.INACTIVE) {
                throw new BusinessException("Khóa học mới chỉ được kích hoạt qua quy trình phê duyệt.");
            }
            requireActiveSelfStudyPackage(id);
        }
        existingEntity.setStatus(request.getStatus());

        CourseEntity updatedEntity = courseRepository.save(existingEntity);
        meilisearchCourseService.index(updatedEntity, hasActivePackage(updatedEntity));
        publicCatalogVectorService.indexCourse(updatedEntity);
        deactivatePackagesIfCourseNotActive(updatedEntity);
        notifyAssignedTeachers(
                updatedEntity,
                "Cập nhật trạng thái khóa học",
                "Khóa học '" + updatedEntity.getName() + "' đã được chuyển sang trạng thái: " + getCourseStatusLabel(updatedEntity.getStatus())
        );
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_STATUS", "COURSE", id, null, updatedEntity));
        return courseMapper.toResponse(updatedEntity);
    }

    @Transactional
    @Override
    public CourseResponse approveCourse(Long id, CourseApprovalRequest request) {
        log.info("Admin approving/rejecting course: {}", id);

        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (course.getStatus() != CourseStatusEnum.PENDING) {
            throw new BusinessException("Chỉ khóa học đang chờ duyệt mới được phê duyệt hoặc từ chối.");
        }

        if (Boolean.TRUE.equals(request.getApprove())) {
            requireActiveSelfStudyPackage(id);
            course.setStatus(CourseStatusEnum.ACTIVE);
            course.setRejectionReason(null);
            publishCourseAssessments(id);
            log.info("Course {} approved and activated for sale", id);
        } else {
            if (request.getRejectionReason() == null || request.getRejectionReason().trim().length() < 5) {
                throw new BusinessException("Lý do từ chối khóa học phải có ít nhất 5 ký tự.");
            }
            course.setStatus(CourseStatusEnum.REJECTED);
            course.setRejectionReason(request.getRejectionReason().trim());
            log.info("Course {} rejected with reason: {}", id, request.getRejectionReason());
        }

        CourseEntity saved = courseRepository.save(course);
        meilisearchCourseService.index(saved, isActiveForSale(saved));
        publicCatalogVectorService.indexCourse(saved);
        deactivatePackagesIfCourseNotActive(saved);
        ApprovalRequestEntity approvalHistory = approvalRequestRepository
                .findFirstByTargetTypeAndTargetIdAndStatusOrderByLevelDesc(
                        "COURSE", saved.getId(), ApprovalStatusEnum.PENDING)
                .orElseGet(() -> ApprovalRequestEntity.builder()
                        .targetType("COURSE")
                        .targetId(saved.getId())
                        .level(1)
                        .totalLevels(1)
                        .createdBy(saved.getCreatedBy())
                        .createdAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now())
                        .build());
        approvalHistory.setApproverId(saved.getUpdatedBy());
        approvalHistory.setStatus(Boolean.TRUE.equals(request.getApprove())
                ? ApprovalStatusEnum.CONFIRMED
                : ApprovalStatusEnum.REJECTED);
        approvalHistory.setComment(Boolean.TRUE.equals(request.getApprove()) ? null : saved.getRejectionReason());
        approvalHistory.setDecidedAt(LocalDateTime.now());
        approvalRequestRepository.save(approvalHistory);

        boolean isApproved = Boolean.TRUE.equals(request.getApprove());
        String title = isApproved ? "Khóa học đã được phê duyệt" : "Khóa học đã bị từ chối";
        String content = isApproved
                ? "Khóa học “" + saved.getName() + "” đã được phê duyệt và kích hoạt."
                : "Khóa học “" + saved.getName() + "” bị từ chối. Lý do: " + saved.getRejectionReason();
        notifyAssignedTeachers(saved, title, content);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "APPROVE_COURSE", "COURSE", id, null, saved));
        return courseMapper.toResponse(saved);
    }

    /** Lấy danh sách khóa học PENDING từ MySQL, không dùng dữ liệu chỉ mục tìm kiếm. */
    @Override
    public PageResponse<CourseResponse> getPendingApprovalCourses(BaseSearchRequest request) {
        Page<CourseEntity> page = courseRepository.findByStatus(
                CourseStatusEnum.PENDING, request != null ? request.toPageable() : PageRequest.of(0, 10));
        return PageResponse.from(page.map(courseMapper::toResponse));
    }

    /** Mở quiz và assignment nháp cùng lúc với khóa học được phê duyệt. */
    private void publishCourseAssessments(Long courseId) {
        List<QuizEntity> quizzes = quizRepository.findByCourseId(courseId);
        quizzes.stream()
                .filter(quiz -> quiz.getStatus() == BaseStatusEnum.DRAFT
                        || quiz.getStatus() == BaseStatusEnum.PENDING)
                .forEach(quiz -> quiz.setStatus(BaseStatusEnum.ACTIVE));
        quizRepository.saveAll(quizzes);

        List<AssignmentEntity> assignments = assignmentRepository.findByCourseId(courseId);
        assignments.stream()
                .filter(assignment -> assignment.getStatus() == BaseStatusEnum.DRAFT
                        || assignment.getStatus() == BaseStatusEnum.PENDING)
                .forEach(assignment -> assignment.setStatus(BaseStatusEnum.ACTIVE));
        assignmentRepository.saveAll(assignments);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Soft deleting course with id: {}", id);

        CourseEntity entity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        entity.setStatus(CourseStatusEnum.DELETED);
        CourseEntity saved = courseRepository.save(entity);
        meilisearchCourseService.delete(saved.getId());
        publicCatalogVectorService.deleteCourse(saved.getId());
        deactivatePackagesIfCourseNotActive(saved);

        notifyAssignedTeachers(
                saved,
                "Khóa học đã bị xóa/lưu trữ",
                "Khóa học '" + saved.getName() + "' đã bị chuyển sang trạng thái ngưng sử dụng."
        );

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "SOFT_DELETE", "COURSE", id, null, null));
    }

    /** Khởi tạo cấu hình và đồng bộ lại index khóa học sau khi ứng dụng sẵn sàng. */
    @EventListener(ApplicationReadyEvent.class)
    public void initializeCourseSearchIndex() {
        if (meilisearchCourseService.isEnabled()) {
            courseRepository.findAll().forEach(course -> meilisearchCourseService.index(course, isActiveForSale(course)));
            meilisearchCourseService.configureIndex();
        }
        if (vectorStartupSync) {
            publicCatalogVectorService.indexCourses(courseRepository.findAll());
        }
    }

    /** Kiểm tra khóa học có package đang hoạt động để phục vụ index tìm kiếm. */
    private boolean hasActivePackage(CourseEntity course) {
        return isActiveForSale(course);
    }

    /** Xác định khóa học public dựa trên trạng thái và bất kỳ package đang hoạt động. */
    private boolean isActiveForSale(CourseEntity course) {
        return course.getStatus() == CourseStatusEnum.ACTIVE
                && coursePackageRepository.findByCourseEntity_Id(course.getId()).stream()
                .anyMatch(pkg -> pkg.getStatus() == CoursePackageStatusEnum.ACTIVE);
    }

    private void notifyAssignedTeachers(CourseEntity course, String title, String content) {
        if (course == null || course.getId() == null) return;
        try {
            List<CourseTeacherEntity> teachers = courseTeacherRepository.findByCourseEntity_Id(course.getId());
            Set<Long> notifiedUserIds = new HashSet<>();

            for (CourseTeacherEntity ct : teachers) {
                if (ct.getUserEntity() != null && ct.getUserEntity().getId() != null) {
                    Long uid = ct.getUserEntity().getId();
                    if (!notifiedUserIds.contains(uid)) {
                        notifiedUserIds.add(uid);
                        notificationService.createSystemNotification(
                                ct.getUserEntity(),
                                NotificationTypeEnum.GENERAL,
                                title,
                                content,
                                course.getId(),
                                "/teacher/courses"
                        );
                    }
                }
            }

            if (course.getCreatedBy() != null && !notifiedUserIds.contains(course.getCreatedBy())) {
                notifiedUserIds.add(course.getCreatedBy());
                userRepository.findById(course.getCreatedBy()).ifPresent(creator ->
                        notificationService.createSystemNotification(
                                creator,
                                NotificationTypeEnum.GENERAL,
                                title,
                                content,
                                course.getId(),
                                "/teacher/courses"
                        )
                );
            }
        } catch (Exception e) {
            log.warn("Could not send system notification to course teachers for course {}", course.getId(), e);
        }
    }

    private String getCourseStatusLabel(CourseStatusEnum status) {
        if (status == null) return "Chưa xác định";
        switch (status) {
            case ACTIVE: return "Đang hoạt động (ACTIVE)";
            case PENDING: return "Chờ duyệt (PENDING)";
            case DRAFT: return "Bản nháp (DRAFT)";
            case REJECTED: return "Từ chối (REJECTED)";
            case INACTIVE: return "Đã ẩn / Lưu trữ (INACTIVE)";
            case DELETED: return "Đã xóa (DELETED)";
            default: return status.name();
        }
    }

    /** Chỉ vô hiệu hóa gói khi khóa học bị ngừng bán/xóa; giữ gói ACTIVE để có thể duyệt bản nháp. */
    private void deactivatePackagesIfCourseNotActive(CourseEntity course) {
        if (course == null || course.getId() == null) return;
        if (course.getStatus() == CourseStatusEnum.INACTIVE || course.getStatus() == CourseStatusEnum.DELETED) {
            log.info("Course {} status is {}, deactivating all its course packages", course.getId(), course.getStatus());
            coursePackageRepository.deactivateAllByCourseId(course.getId());
        }
    }

    /** Chặn xuất bản nếu khóa học chưa có ít nhất một gói tự học đang hoạt động. */
    private void requireActiveSelfStudyPackage(Long courseId) {
        long activeSelfStudyPackages = coursePackageRepository
                .countByCourseEntity_IdAndDeliveryModeAndStatus(
                        courseId, DeliveryModeEnum.SELF_STUDY, CoursePackageStatusEnum.ACTIVE);
        if (activeSelfStudyPackages == 0) {
            throw new BusinessException(
                    "Khóa học phải có ít nhất một gói tự học đang hoạt động trước khi xuất bản.");
        }
    }

    @Transactional
    @Override
    public CourseResponse getById(Long id) {
        log.info("Getting course by id: {}", id);

        CourseEntity entity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        try {
            entity.setViewCount((entity.getViewCount() != null ? entity.getViewCount() : 0) + 1);
            courseRepository.save(entity);
        } catch (Exception e) {
            log.warn("Could not update view count for course {}: {}", id, e.getMessage());
        }

        return courseMapper.toResponse(entity);
    }

    /** Tính các chỉ số tổng quan từ dữ liệu khóa học, gói học và đánh giá đang hiển thị. */
    @Override
    public CourseMetricResponse getMetrics(Long id) {
        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        long reviewCount = reviewRepository.countByCourseIdAndStatus(id, ReviewStatusEnum.ACTIVE);
        long positiveReviewCount = reviewRepository
                .countByCourseIdAndStatusAndRatingGreaterThanEqual(id, ReviewStatusEnum.ACTIVE, 4);
        Double averageRating = reviewRepository.getAverageRatingForCourseAndStatus(id, ReviewStatusEnum.ACTIVE);
        List<CoursePackageEntity> activePackages = coursePackageRepository.findByCourseEntity_Id(id).stream()
                .filter(item -> item.getStatus() == CoursePackageStatusEnum.ACTIVE)
                .toList();
        List<DeliveryModeEnum> deliveryModes = activePackages.stream()
                .map(CoursePackageEntity::getDeliveryMode)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        DeliveryModeEnum deliveryMode = deliveryModes.size() == 1 ? deliveryModes.getFirst() : null;
        int satisfactionPercent = reviewCount == 0 ? 0
                : (int) Math.round((double) positiveReviewCount * 100 / reviewCount);
        return CourseMetricResponse.builder()
                .courseId(id)
                .moduleCount(courseSectionRepository.countByCourseEntityId(id))
                .averageRating(averageRating != null ? averageRating : 0D)
                .reviewCount(reviewCount)
                .level(course.getLevel() != null ? course.getLevel().name() : null)
                .deliveryMode(deliveryMode)
                .satisfactionPercent(satisfactionPercent)
                .build();
    }

    @Override
    public PageResponse<CourseResponse> search(CourseSearchRequest request) {
        log.info("Searching courses with keyword: {}", request.getKeyword());

        PageResponse<CourseResponse> indexedResult = meilisearchCourseService.search(request);
        if (indexedResult != null) {
            return indexedResult;
        }

        Page<CourseEntity> page = request.getStatus() == CourseStatusEnum.ACTIVE
                ? courseRepository.findActiveCoursesForSale(
                        request.getKeyword(), request.getCategoryId(), request.getLevel(), request.toPageable())
                : courseRepository.findAll(CourseSpecification.filterAndSearch(request), request.toPageable());

        return PageResponse.from(page.map(courseMapper::toResponse));
    }

    @Override
    public List<ClassResponse> getSuggestedClassesForTeacher(Long teacherUserId) {
        log.info("Getting suggested classes for teacher: {}", teacherUserId);

        List<TeacherCategoryEntity> activeAssignments = teacherCategoryRepository.findByEmployee_UserId(teacherUserId).stream()
                .filter(tc -> tc.getStatus() == BaseStatusEnum.ACTIVE)
                .toList();

        List<Long> categoryIds = activeAssignments.stream().map(tc -> tc.getCategory().getId()).toList();
        if (categoryIds.isEmpty()) {
            return List.of();
        }

        List<ClassEntity> suggestedClasses = classRepository.findAll().stream()
                .filter(c -> c.getCategoryEntity() != null && categoryIds.contains(c.getCategoryEntity().getId()))
                .filter(c -> c.getMaxMembers() == null || c.getCurrentMemberCount() == null || c.getCurrentMemberCount() < c.getMaxMembers())
                .toList();

        return classMapper.toResponseList(suggestedClasses);
    }

    @Transactional
    @Override
    public ClassResponse claimClass(Long teacherUserId, Long classId) {
        log.info("Teacher {} claiming class {}", teacherUserId, classId);

        ClassEntity clazz = classRepository.findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));

        if (clazz.getCategoryEntity() != null) {
            Long catId = clazz.getCategoryEntity().getId();
            boolean isAssigned = teacherCategoryRepository.findByEmployee_UserIdAndCategory_Id(teacherUserId, catId)
                    .map(tc -> tc.getStatus() == BaseStatusEnum.ACTIVE)
                    .orElse(false);

            if (!isAssigned) {
                throw new BusinessException("Teacher is not assigned to class category: " + catId);
            }
        }

        UserEntity user = userRepository.findById(teacherUserId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", teacherUserId));

        // Package type logic
        if (clazz.getPackageType() == DeliveryModeEnum.ONE_ON_ONE) {
            // Check if 1-1 class already has a teacher
            boolean alreadyAssigned = classMemberRepository.findById_ClassId(classId).stream()
                    .anyMatch(cm -> cm.getRoleInClass() == ClassMemberRole.TEACHER || cm.getRoleInClass() == ClassMemberRole.TA);

            if (alreadyAssigned) {
                throw new BusinessException("Class 1-1 already has a teacher/TA assigned.");
            }
        } else if (clazz.getPackageType() == DeliveryModeEnum.GROUP_CLASS) {
            if (clazz.getMaxMembers() != null && clazz.getCurrentMemberCount() != null && clazz.getCurrentMemberCount() >= clazz.getMaxMembers()) {
                throw new BusinessException("Class group capacity reached. Cannot claim.");
            }
        }

        ClassMemberId id = new ClassMemberId(classId, teacherUserId);
        ClassMemberEntity member = ClassMemberEntity.builder()
                .id(id)
                .classEntity(clazz)
                .userEntity(user)
                .roleInClass(ClassMemberRole.TEACHER)
                .status(ClassMemberStatusEnum.ACTIVE)
                .joinedAt(LocalDateTime.now())
                .build();

        classMemberRepository.save(member);
        clazz.setCurrentMemberCount((clazz.getCurrentMemberCount() != null ? clazz.getCurrentMemberCount() : 0) + 1);
        classRepository.save(clazz);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CLAIM_CLASS", "CLASS", classId, null, clazz));
        return classMapper.toResponse(clazz);
    }

    @Override
    public PageResponse<CourseResponse> getOutstandingCourses(BaseSearchRequest request) {
        log.info("Getting outstanding courses, page: {}, size: {}", request.getPage(), request.getSize());
        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(
                        Sort.Order.desc("avgRating"),
                        Sort.Order.desc("reviewCount"),
                        Sort.Order.desc("enrollmentCount")
                )
        );
        Page<CourseEntity> page = courseRepository.findActiveCoursesForSale(null, null, null, pageable);
        return PageResponse.from(page.map(courseMapper::toResponse));
    }

    @Override
    public PageResponse<CourseResponse> getTrendingCourses(BaseSearchRequest request) {
        log.info("Getting trending courses, page: {}, size: {}", request.getPage(), request.getSize());
        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(Sort.Order.desc("trendingScore"))
        );
        Page<CourseEntity> page = courseRepository.findActiveCoursesForSale(null, null, null, pageable);
        return PageResponse.from(page.map(courseMapper::toResponse));
    }

    @Override
    public PageResponse<CourseResponse> getLatestCourses(BaseSearchRequest request) {
        log.info("Getting latest courses, page: {}, size: {}", request.getPage(), request.getSize());
        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(Sort.Order.desc("createdAt"))
        );
        Page<CourseEntity> page = courseRepository.findActiveCoursesForSale(null, null, null, pageable);
        return PageResponse.from(page.map(courseMapper::toResponse));
    }

    @Transactional
    @Override
    public void recalculateTrendingScores() {
        log.info("Recalculating trending scores for all courses");
        List<CourseEntity> courses = courseRepository.findAll();
        for (CourseEntity course : courses) {
            long enrollments = enrollmentRepository.countByCourseEntity_Id(course.getId());
            course.setEnrollmentCount((int) enrollments);

            double avgRating = course.getAvgRating() != null ? course.getAvgRating() : 0.0;
            int reviewCount = course.getReviewCount() != null ? course.getReviewCount() : 0;
            int viewCount = course.getViewCount() != null ? course.getViewCount() : 0;

            double score = (enrollments * 5.0) + (viewCount * 0.2) + (avgRating * reviewCount * 1.5);
            course.setTrendingScore(Math.round(score * 100.0) / 100.0);

            courseRepository.save(course);
        }
    }

    @Override
    public long countActiveCourses() {
        log.info("Counting all active courses");
        return courseRepository.countByStatus(CourseStatusEnum.ACTIVE);
    }

    /** Chuẩn bị khóa học mới với mã tự sinh và các giá trị mặc định nghiệp vụ. */
    private CourseEntity prepareCourse(
            CreateCourseRequest request,
            CategoryEntity category,
            CourseStatusEnum defaultStatus) {
        CourseEntity course = courseMapper.toEntity(request);
        course.setCode(CodeGenerator.generate(CODE_PREFIX, courseRepository::existsByCode));
        course.setCategoryEntity(category);
        course.setLink(resolveLink(request.getLink(), request.getName()));
        course.setStatus(request.getStatus() != null ? request.getStatus() : defaultStatus);
        course.setCertificateConditionType(request.getCertificateConditionType() != null
                ? request.getCertificateConditionType()
                : CertificateConditionTypeEnum.COMPLETION_RATE);
        return course;
    }

    private String resolveLink(String link, String courseName) {
        return link == null || link.isBlank() ? generateSlug(courseName) : link;
    }

    private String generateSlug(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String slug = pattern.matcher(normalized).replaceAll("");
        return slug.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .trim();
    }
}
