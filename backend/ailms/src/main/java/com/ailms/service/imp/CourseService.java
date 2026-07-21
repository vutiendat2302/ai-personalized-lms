package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
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
import com.ailms.service.ICourseService;
import com.ailms.service.IEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final IEmailService emailService;
    private final ApplicationEventPublisher applicationEventPublisher;

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

        String link = request.getLink();
        if (link == null || link.trim().isEmpty()) {
            link = generateSlug(request.getName());
        }

        CourseEntity entity = courseMapper.toEntity(request);
        entity.setCategoryEntity(category);
        entity.setLink(link);
        entity.setStatus(CourseStatusEnum.DRAFT);

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

        String link = request.getLink();
        if (link == null || link.trim().isEmpty()) {
            link = generateSlug(request.getName());
        }

        CourseEntity entity = courseMapper.toEntity(request);
        entity.setCategoryEntity(category);
        entity.setLink(link);
        entity.setStatus(CourseStatusEnum.PENDING);

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

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.of("Category", request.getCategoryId()));

        String link = request.getLink();
        if (link == null || link.trim().isEmpty()) {
            link = generateSlug(request.getName());
        }

        courseMapper.updateEntityFromRequest(request, existingEntity);
        existingEntity.setCategoryEntity(category);
        existingEntity.setLink(link);

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

        existingEntity.setStatus(CourseStatusEnum.valueOf(request.getStatus().toString()));

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
            course.setStatus(CourseStatusEnum.REJECTED);
            course.setRejectionReason(request.getRejectionReason());
            log.info("Course {} rejected with reason: {}", id, request.getRejectionReason());
        }

        CourseEntity saved = courseRepository.save(course);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "APPROVE_COURSE", "COURSE", id, null, saved));
        return courseMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Deleting course with id: {}", id);

        if (!courseRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }

        courseRepository.deleteById(id);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "COURSE", id, null, null));
    }

    @Override
    public CourseResponse getById(Long id) {
        log.info("Getting course by id: {}", id);

        CourseEntity entity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

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
