package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.specification.ClassSpecification;
import com.ailms.request.ClassSearchRequest;
import com.ailms.request.CreateClassRequest;
import com.ailms.request.UpdateClassRequest;
import com.ailms.request.UpdateClassScheduleSlotRequest;
import com.ailms.service.IClassService;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.ClassScheduleEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassMapper;
import com.ailms.mapper.ClassScheduleMapper;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.ClassScheduleRepository;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.response.ClassResponse;
import com.ailms.response.ClassScheduleResponse;
import com.ailms.response.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.HashSet;

import com.ailms.search.MeilisearchClassService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ClassService implements IClassService {

    private final ApplicationEventPublisher applicationEventPublisher;
    private final ClassRepository classRepository;
    private final CourseRepository courseRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassMapper classMapper;
    private final ClassScheduleRepository classScheduleRepository;
    private final ClassScheduleMapper classScheduleMapper;
    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final MeilisearchClassService meilisearchClassService;

    private static final String RESOURCE_NAME = "Class";

    @Override
    public PageResponse<ClassResponse> search(ClassSearchRequest request) {
        PageResponse<ClassResponse> indexedResult = meilisearchClassService.search(request);
        if (indexedResult != null) {
            return indexedResult;
        }

        log.info("Searching Class via specification");
        Specification<ClassEntity> spec = ClassSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<ClassEntity> page = classRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::enrichClassResponse));
    }

    /** Khởi tạo cấu hình và đồng bộ lại index lớp học sau khi ứng dụng sẵn sàng. */
    @EventListener(ApplicationReadyEvent.class)
    public void initializeClassSearchIndex() {
        if (!meilisearchClassService.isEnabled()) return;
        classRepository.findAll().forEach(meilisearchClassService::index);
        meilisearchClassService.configureIndex();
    }

    private ClassResponse enrichClassResponse(ClassEntity entity) {
        if (entity == null) return null;
        ClassResponse response = classMapper.toResponse(entity);
        if (response != null) {
            String existingCode = entity.getCode();
            if (existingCode != null && !existingCode.isBlank()) {
                response.setCode(existingCode);
            } else {
                response.setCode("LH-" + entity.getId());
            }

            // Dynamic count of actual ACTIVE students in the class
            long activeStudentCount = classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                    entity.getId(),
                    ClassMemberStatusEnum.ACTIVE,
                    ClassMemberRole.STUDENT
            );
            response.setCurrentMemberCount((int) activeStudentCount);

            classMemberRepository.findById_ClassId(entity.getId()).stream()
                    .filter(cm -> cm.getStatus() == ClassMemberStatusEnum.ACTIVE
                            && (cm.getRoleInClass() == ClassMemberRole.TEACHER
                            || cm.getRoleInClass() == ClassMemberRole.TA))
                    .findFirst()
                    .ifPresent(cm -> {
                        if (cm.getUserEntity() != null) {
                            String tName = cm.getUserEntity().getFullName() != null && !cm.getUserEntity().getFullName().isBlank()
                                    ? cm.getUserEntity().getFullName()
                                    : cm.getUserEntity().getUsername();
                            response.setTeacherName(tName);
                        }
                    });
        }
        return response;
    }

    public List<ClassResponse> getAll() {
        log.info("Getting all classes");
        return classRepository.findAll().stream().map(this::enrichClassResponse).toList();
    }

    @Override
    public List<ClassResponse> getTeachingClassesByUserId(Long userId) {
        log.info("Getting teaching classes for user: {}", userId);
        return classMemberRepository.findById_UserId(userId).stream()
                .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(member -> member.getRoleInClass() == ClassMemberRole.TEACHER
                        || member.getRoleInClass() == ClassMemberRole.TA)
                .map(ClassMemberEntity::getClassEntity)
                .distinct()
                .map(this::enrichClassResponse)
                .toList();
    }

    /** Lấy duy nhất các lớp ACTIVE mà người dùng là học viên ACTIVE. */
    @Override
    public List<ClassResponse> getStudentClassesByUserId(Long userId) {
        log.info("Getting enrolled classes for student user: {}", userId);
        Set<Long> activeCourseIds = new HashSet<>(
                enrollmentPackageRepository.findActiveCourseIdsByUser(userId, LocalDateTime.now()));
        return classMemberRepository.findById_UserId(userId).stream()
                .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(member -> member.getRoleInClass() == ClassMemberRole.STUDENT)
                .map(ClassMemberEntity::getClassEntity)
                .filter(entity -> entity.getCourseEntity() != null
                        && activeCourseIds.contains(entity.getCourseEntity().getId()))
                .filter(entity -> entity.getStatus() != BaseStatusEnum.DELETED
                        && entity.getStatus() != BaseStatusEnum.DELETE)
                .distinct().map(this::enrichClassResponse).toList();
    }

    public ClassResponse getById(Long id) {
        log.info("Getting class by id: {}", id);
        ClassEntity entity = classRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return enrichClassResponse(entity);
    }

    public List<ClassResponse> getByCourseId(Long courseId) {
        log.info("Getting classes by course id: {}", courseId);
        return classRepository.findByCourseEntity_Id(courseId).stream().map(this::enrichClassResponse).toList();
    }

    @Override
    public List<ClassScheduleResponse> getSchedules(Long classId) {
        if (!classRepository.existsById(classId)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, classId);
        }
        return classScheduleMapper.toResponseList(classScheduleRepository.findByClassEntity_Id(classId));
    }

    @Override
    @Transactional
    public List<ClassScheduleResponse> updateSchedules(Long classId, List<UpdateClassScheduleSlotRequest> schedules) {
        ClassEntity classEntity = classRepository.findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, classId));

        classScheduleRepository.deleteByClassEntity_Id(classId);

        if (schedules != null) {
            for (UpdateClassScheduleSlotRequest slot : schedules) {
                ClassScheduleEntity schedule = ClassScheduleEntity.builder()
                        .classEntity(classEntity)
                        .dayOfWeek(slot.getDayOfWeek())
                        .startTime(slot.getStartTime())
                        .endTime(slot.getEndTime())
                        .status(BaseStatusEnum.ACTIVE)
                        .build();
                classScheduleRepository.save(schedule);
            }
        }
        return classScheduleMapper.toResponseList(classScheduleRepository.findByClassEntity_Id(classId));
    }

    @Transactional
    public ClassResponse create(CreateClassRequest request) {
        log.info("Creating class for course: {}", request.getCourseId());
        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        ClassEntity entity = classMapper.toEntity(request);
        entity.setCourseEntity(course);
        entity.setCode(CodeGenerator.generate("LH", classRepository::existsByCode));

        ClassEntity saved = classRepository.save(entity);
        meilisearchClassService.index(saved);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "CLASS", saved.getId(), null, saved));
        return enrichClassResponse(saved);
    }

    @Transactional
    public ClassResponse update(Long id, UpdateClassRequest request) {
        log.info("Updating class: {}", id);
        ClassEntity existing = classRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(existing);
        classMapper.updateFromRequest(request, existing);

        ClassEntity updated = classRepository.save(existing);
        meilisearchClassService.index(updated);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "CLASS", id, oldValue, updated));
        return enrichClassResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting class: {}", id);
        if (!classRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        classRepository.deleteById(id);
        meilisearchClassService.delete(id);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "CLASS", id, id, null));
    }
}
