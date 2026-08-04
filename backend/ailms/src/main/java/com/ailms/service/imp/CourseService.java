package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
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
import com.ailms.response.PageResponse;
import com.ailms.request.BaseSearchRequest;
import com.ailms.service.ICourseService;
import com.ailms.service.INotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
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

    private static final String RESOURCE_NAME = "Course";

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

        CourseEntity entity = prepareCourse(request, category, CourseStatusEnum.PENDING);
        entity.setCreatedBy(teacherUserId);

        CourseEntity savedEntity = courseRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_BY_TEACHER", "COURSE", savedEntity.getId(), null, savedEntity));
        return courseMapper.toResponse(savedEntity);
    }

    @Transactional
    @Override
    public CourseResponse update(Long id, UpdateCourseRequest request) {
        log.info("Updating course with id: {}", id);

        CourseEntity existingEntity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        courseMapper.updateEntityFromRequest(request, existingEntity);
        existingEntity.setLink(resolveLink(request.getLink(), request.getName()));

        CourseEntity updatedEntity = courseRepository.save(existingEntity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "COURSE", id, null, updatedEntity));
        return courseMapper.toResponse(updatedEntity);
    }

    @Transactional
    @Override
    public CourseResponse updateStatus(Long id, CourseStatusRequest request) {
        log.info("Updating status for course id: {}", id);

        CourseEntity existingEntity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        existingEntity.setStatus(request.getStatus());

        CourseEntity updatedEntity = courseRepository.save(existingEntity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE_STATUS", "COURSE", id, null, updatedEntity));
        return courseMapper.toResponse(updatedEntity);
    }

    @Transactional
    @Override
    public CourseResponse approveCourse(Long id, CourseApprovalRequest request) {
        log.info("Admin approving/rejecting course: {}", id);

        CourseEntity course = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (Boolean.TRUE.equals(request.getApprove())) {
            course.setStatus(CourseStatusEnum.ACTIVE);
            course.setRejectionReason(null);
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
        ApprovalRequestEntity approvalHistory = ApprovalRequestEntity.builder()
                .targetType("COURSE")
                .targetId(saved.getId())
                .level(1)
                .totalLevels(1)
                .approverId(saved.getUpdatedBy())
                .status(Boolean.TRUE.equals(request.getApprove())
                        ? ApprovalStatusEnum.CONFIRMED
                        : ApprovalStatusEnum.REJECTED)
                .comment(Boolean.TRUE.equals(request.getApprove()) ? null : saved.getRejectionReason())
                .decidedAt(LocalDateTime.now())
                .createdBy(saved.getCreatedBy())
                .createdAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now())
                .build();
        approvalRequestRepository.save(approvalHistory);
        if (saved.getCreatedBy() != null) {
            userRepository.findById(saved.getCreatedBy()).ifPresent(creator -> notificationService.createSystemNotification(
                    creator,
                    NotificationTypeEnum.GENERAL,
                    Boolean.TRUE.equals(request.getApprove()) ? "Khóa học đã được phê duyệt" : "Khóa học đã bị từ chối",
                    Boolean.TRUE.equals(request.getApprove())
                            ? "Khóa học “" + saved.getName() + "” đã được phê duyệt và kích hoạt."
                            : "Khóa học “" + saved.getName() + "” bị từ chối. Lý do: " + saved.getRejectionReason(),
                    saved.getId(),
                    "/teacher/courses"
            ));
        }
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "APPROVE_COURSE", "COURSE", id, null, saved));
        return courseMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Soft deleting course with id: {}", id);

        CourseEntity entity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        entity.setStatus(CourseStatusEnum.DELETED);
        courseRepository.save(entity);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "SOFT_DELETE", "COURSE", id, null, null));
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

    @Override
    public PageResponse<CourseResponse> search(CourseSearchRequest request) {
        log.info("Searching courses with keyword: {}", request.getKeyword());

        Page<CourseEntity> page = courseRepository.findAll(
                CourseSpecification.filterAndSearch(request),
                request.toPageable()
        );

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
        Page<CourseEntity> page = courseRepository.findByStatus(CourseStatusEnum.ACTIVE, pageable);
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
        Page<CourseEntity> page = courseRepository.findByStatus(CourseStatusEnum.ACTIVE, pageable);
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
        Page<CourseEntity> page = courseRepository.findByStatus(CourseStatusEnum.ACTIVE, pageable);
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

    private CourseEntity prepareCourse(
            CreateCourseRequest request,
            CategoryEntity category,
            CourseStatusEnum defaultStatus) {
        CourseEntity course = courseMapper.toEntity(request);
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
