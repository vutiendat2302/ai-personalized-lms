package com.ailms.service.imp;

import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.CategoryEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.TeacherCategoryEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.TeacherCategoryMapper;
import com.ailms.repository.CategoryRepository;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.TeacherCategoryRepository;
import com.ailms.request.CreateTeacherCategoryRequest;
import com.ailms.request.UpdateTeacherCategoryRequest;
import com.ailms.response.TeacherCategoryResponse;
import com.ailms.service.INotificationService;
import com.ailms.service.ITeacherCategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeacherCategoryService implements ITeacherCategoryService {

    private final TeacherCategoryRepository teacherCategoryRepository;
    private final EmployeeRepository employeeRepository;
    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final ClassMemberRepository classMemberRepository;
    private final TeacherCategoryMapper teacherCategoryMapper;
    private final INotificationService notificationService;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "TeacherCategory";

    @Override
    public List<TeacherCategoryResponse> getAll() {
        log.info("Getting all teacher category associations");
        return teacherCategoryMapper.toResponseList(teacherCategoryRepository.findAll());
    }

    @Override
    public List<TeacherCategoryResponse> getByEmployeeId(Long employeeId) {
        log.info("Getting teacher categories for employee: {}", employeeId);
        return teacherCategoryMapper.toResponseList(teacherCategoryRepository.findByEmployee_UserId(employeeId));
    }

    @Transactional
    @Override
    public TeacherCategoryResponse create(CreateTeacherCategoryRequest request) {
        return assignTeacherToCategory(request.getCategoryId(), request.getEmployeeId(), null);
    }

    @Transactional
    @Override
    public TeacherCategoryResponse assignTeacherToCategory(Long categoryId, Long employeeId, Long adminUserId) {
        log.info("Assigning employee {} to category {}", employeeId, categoryId);

        CategoryEntity category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> ResourceNotFoundException.of("Category", categoryId));

        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", employeeId));

        // Verify position/role is TEACHER or TA or PART_TIME teacher
        if (employee.getPosition() != null && !employee.getPosition().toUpperCase().contains("TEACHER") && !employee.getPosition().toUpperCase().contains("TA")) {
            log.warn("Employee {} position is {}, granting category assignment anyway for flexibility", employeeId, employee.getPosition());
        }

        // Check 409 Conflict if already active
        teacherCategoryRepository.findByEmployee_UserIdAndCategory_Id(employeeId, categoryId).ifPresent(tc -> {
            if (tc.getStatus() == BaseStatusEnum.ACTIVE) {
                throw new DuplicateResourceException("Teacher " + employeeId + " is already assigned to category " + categoryId);
            }
        });

        TeacherCategoryEntity tc = teacherCategoryRepository.findByEmployee_UserIdAndCategory_Id(employeeId, categoryId)
                .orElseGet(() -> TeacherCategoryEntity.builder().employee(employee).category(category).build());

        tc.setStatus(BaseStatusEnum.ACTIVE);
        tc.setAssignedBy(adminUserId);
        tc.setUnassignedAt(null);

        TeacherCategoryEntity saved = teacherCategoryRepository.save(tc);

        // Thông báo nội bộ cho Teacher/TA; nghiệp vụ này không gửi email.
        if (employee.getUserEntity() != null) {
            notificationService.createSystemNotification(
                    employee.getUserEntity(),
                    NotificationTypeEnum.GENERAL,
                    "Bạn được phân công chuyên môn mới",
                    "Bạn đã được phân công phụ trách danh mục “" + category.getName()
                            + "”. Bạn có thể xem và quản lý các khóa học thuộc chuyên môn này.",
                    category.getId(),
                    "/teacher/courses"
            );
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ASSIGN_TEACHER_CATEGORY", "TEACHER_CATEGORY", saved.getId(), null, saved));
        return teacherCategoryMapper.toResponse(saved);
    }

    @Transactional
    @Override
    public void unassignTeacherFromCategory(Long categoryId, Long employeeId) {
        log.info("Unassigning employee {} from category {}", employeeId, categoryId);

        TeacherCategoryEntity tc = teacherCategoryRepository.findByEmployee_UserIdAndCategory_Id(employeeId, categoryId)
                .orElseThrow(() -> ResourceNotFoundException.of("TeacherCategory", "employeeId=" + employeeId + ", categoryId=" + categoryId));

        if (tc.getStatus() == BaseStatusEnum.UNASSIGNED) {
            return;
        }

        // Only block when this teacher (not merely another teacher in the same
        // category) still owns an active course or teaches an active class.
        boolean hasActiveCourses = courseRepository.findAll().stream()
                .anyMatch(c -> c.getCategoryEntity() != null && categoryId.equals(c.getCategoryEntity().getId())
                        && employeeId.equals(c.getCreatedBy())
                        && c.getStatus() != null && c.getStatus().name().equals("ACTIVE"));

        boolean hasActiveClasses = classMemberRepository.findById_UserId(employeeId).stream()
                .anyMatch(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE
                        && (member.getRoleInClass() == ClassMemberRole.TEACHER || member.getRoleInClass() == ClassMemberRole.TA)
                        && member.getClassEntity() != null
                        && member.getClassEntity().getCategoryEntity() != null
                        && categoryId.equals(member.getClassEntity().getCategoryEntity().getId())
                        && member.getClassEntity().getStatus() == BaseStatusEnum.ACTIVE);

        if (hasActiveCourses || hasActiveClasses) {
            throw new BusinessException("Cannot unassign teacher " + employeeId + " from category " + categoryId + " because active courses/classes exist. Reassign or resolve courses first.");
        }

        tc.setStatus(BaseStatusEnum.UNASSIGNED);
        tc.setUnassignedAt(LocalDateTime.now());
        teacherCategoryRepository.save(tc);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UNASSIGN_TEACHER_CATEGORY", "TEACHER_CATEGORY", tc.getId(), null, tc));
    }

    @Transactional
    @Override
    public void delete(Long id) {
        log.info("Deleting teacher category association: {}", id);
        TeacherCategoryEntity entity = teacherCategoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        teacherCategoryRepository.delete(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "TEACHER_CATEGORY", id, entity, null));
    }

    @Override
    public void update(Long id, UpdateTeacherCategoryRequest request) {
        TeacherCategoryEntity entity = teacherCategoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        String oldValue = SimpleJsonWriter.toJson(entity);
        teacherCategoryMapper.update(request, entity);
        CategoryEntity categoryEntity = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.of("Category", id));
        entity.setCategory(categoryEntity);
        teacherCategoryRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "TEACHER_CATEGORY", id, oldValue, entity));
    }
}
