package com.ailms.service.imp;

import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassMapper;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.ClassResponse;
import com.ailms.response.CoursePackageResponse;
import com.ailms.service.IClassManagementService;
import com.ailms.service.ICoursePackageService;
import com.ailms.service.IEmailService;
import com.ailms.service.ITeacherMatchingService;
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
public class ClassManagementService implements IClassManagementService {

    private final ClassRepository classRepository;
    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassScheduleRepository classScheduleRepository;
    private final ClassOnlineRepository classOnlineRepository;
    private final TeacherCategoryRepository teacherCategoryRepository;
    private final TeacherAvailabilityRepository teacherAvailabilityRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final ITeacherMatchingService teacherMatchingService;
    private final ClassMapper classMapper;
    private final ICoursePackageService coursePackageService;
    private final IEmailService emailService;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "Class";

    /** Tạo lớp nhóm mới và kiểm tra điều kiện giảng viên, lịch học. */
    @Transactional
    @Override
    public ClassResponse createGroupClass(CreateGroupClassRequest request) {
        log.info("Creating group class: {} for course: {}", request.getName(), request.getCourseId());

        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.of("Category", request.getCategoryId()));

        // Check teacher category and collision if teacher assigned
        if (request.getTeacherEmployeeId() != null) {
            boolean isAssigned = teacherCategoryRepository.existsByEmployee_UserIdAndCategory_IdAndStatus(
                    request.getTeacherEmployeeId(), request.getCategoryId(), BaseStatusEnum.ACTIVE);

            if (!isAssigned) {
                throw new BusinessException("Selected teacher is not assigned to course category: " + request.getCategoryId());
            }

            String collisionDetail = teacherMatchingService.findScheduleCollisionDetail(request.getTeacherEmployeeId(), request.getSchedules());
            if (collisionDetail != null) {
                throw new BusinessException(collisionDetail);
            }
        }

        ClassEntity clazz = ClassEntity.builder()
                .courseEntity(course)
                .categoryEntity(category)
                .name(request.getName())
                .code(CodeGenerator.generate("LH", classRepository::existsByCode))
                .packageType(DeliveryModeEnum.GROUP_CLASS)
                .maxMembers(request.getMaxMembers())
                .currentMemberCount(0)
                .status(BaseStatusEnum.ACTIVE) // READY / OPEN
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();

        ClassEntity savedClass = classRepository.save(clazz);

        // Save class schedules
        if (request.getSchedules() != null) {
            for (CreateGroupClassRequest.ScheduleSlotRequest slot : request.getSchedules()) {
                ClassScheduleEntity schedule = ClassScheduleEntity.builder()
                        .classEntity(savedClass)
                        .dayOfWeek(slot.getDayOfWeek())
                        .startTime(slot.getStartTime())
                        .endTime(slot.getEndTime())
                        .status(BaseStatusEnum.ACTIVE)
                        .build();
                classScheduleRepository.save(schedule);
            }
        }

        // Add teacher member if specified
        if (request.getTeacherEmployeeId() != null) {
            EmployeeEntity teacherEmp = employeeRepository.findById(request.getTeacherEmployeeId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getTeacherEmployeeId()));

            ClassMemberEntity member = ClassMemberEntity.builder()
                    .id(new ClassMemberId(savedClass.getId(), teacherEmp.getUserEntity().getId()))
                    .classEntity(savedClass)
                    .userEntity(teacherEmp.getUserEntity())
                    .roleInClass(ClassMemberRole.TEACHER)
                    .status(ClassMemberStatusEnum.ACTIVE)
                    .joinedAt(LocalDateTime.now())
                    .build();
            classMemberRepository.save(member);
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_GROUP_CLASS", "CLASS", savedClass.getId(), null, savedClass));
        ClassResponse resp = classMapper.toResponse(savedClass);
        if (resp != null) {
            if (request.getTeacherEmployeeId() != null) {
                employeeRepository.findById(request.getTeacherEmployeeId())
                        .ifPresent(emp -> {
                            if (emp.getUserEntity() != null) {
                                String tName = emp.getUserEntity().getFullName() != null && !emp.getUserEntity().getFullName().isBlank()
                                        ? emp.getUserEntity().getFullName()
                                        : emp.getUserEntity().getUsername();
                                resp.setTeacherName(tName);
                            }
                        });
            }
        }
        return resp;
    }

    /** Chuyển luồng tạo gói về service dùng chung để thống nhất mã, validation và audit. */
    @Transactional
    @Override
    public CoursePackageResponse createCoursePackage(CreateCoursePackageRequest request) {
        return coursePackageService.create(request);
    }

    @Transactional
    @Override
    public void processEnrollmentPlacement(Long userId, Long coursePackageId, String requestedScheduleJson) {
        log.info("Processing enrollment placement for user: {}, package: {}", userId, coursePackageId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        CoursePackageEntity pkg = coursePackageRepository.findById(coursePackageId)
                .orElseThrow(() -> ResourceNotFoundException.of("CoursePackage", coursePackageId));

        if (pkg.getDeliveryMode() == DeliveryModeEnum.SELF_STUDY) {
            return;
        }

        if (pkg.getDeliveryMode() == DeliveryModeEnum.GROUP_CLASS) {
            ClassEntity clazz = pkg.getClassEntity();
            if (clazz == null) {
                throw new BusinessException("GROUP_CLASS package has no linked class");
            }

            long activeMembers = classMemberRepository.countById_ClassIdAndStatus(clazz.getId(), ClassMemberStatusEnum.ACTIVE);

            if (activeMembers < clazz.getMaxMembers()) {
                ClassMemberEntity member = ClassMemberEntity.builder()
                        .id(new ClassMemberId(clazz.getId(), userId))
                        .classEntity(clazz)
                        .userEntity(user)
                        .roleInClass(ClassMemberRole.STUDENT)
                        .status(ClassMemberStatusEnum.ACTIVE)
                        .joinedAt(LocalDateTime.now())
                        .build();
                classMemberRepository.save(member);
                clazz.setCurrentMemberCount((int) activeMembers + 1);
                classRepository.save(clazz);
            } else {
                ClassMemberEntity member = ClassMemberEntity.builder()
                        .id(new ClassMemberId(clazz.getId(), userId))
                        .classEntity(clazz)
                        .userEntity(user)
                        .roleInClass(ClassMemberRole.STUDENT)
                        .status(ClassMemberStatusEnum.WAITLISTED)
                        .waitlistedAt(LocalDateTime.now())
                        .build();
                classMemberRepository.save(member);
            }
        } else if (pkg.getDeliveryMode() == DeliveryModeEnum.ONE_ON_ONE) {
            throw new BusinessException(
                    "Gói ONE_ON_ONE chỉ tạo yêu cầu tìm người dạy sau khi PayPal capture thanh toán thành công.");
        }
    }

    @Transactional
    @Override
    public void removeMemberAndPromoteWaitlist(Long classId, Long userId) {
        log.info("Removing member {} from class {} and checking waitlist promotion", userId, classId);

        ClassMemberEntity member = classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                .orElseThrow(() -> ResourceNotFoundException.of("ClassMember", classId));

        member.setStatus(ClassMemberStatusEnum.REMOVED);
        member.setLeftAt(LocalDateTime.now());
        classMemberRepository.save(member);

        // 9.5 FIFO Waitlist Promotion
        List<ClassMemberEntity> waitlisted = classMemberRepository.findById_ClassIdAndStatusOrderByWaitlistedAtAsc(classId, ClassMemberStatusEnum.WAITLISTED);

        if (!waitlisted.isEmpty()) {
            ClassMemberEntity toPromote = waitlisted.getFirst();
            toPromote.setStatus(ClassMemberStatusEnum.ACTIVE);
            toPromote.setJoinedAt(LocalDateTime.now());
            classMemberRepository.save(toPromote);

            // Notify student
            if (toPromote.getUserEntity() != null && toPromote.getUserEntity().getEmail() != null) {
                try {
                    emailService.sendInviteEmail(toPromote.getUserEntity().getEmail(),
                            "Great news! A spot opened up and you have been enrolled in class " + toPromote.getClassEntity().getName());
                } catch (Exception e) {
                    log.error("Failed to send waitlist promotion email", e);
                }
            }

            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CLASS_MEMBER_PROMOTED", "CLASS_MEMBER", classId, null, toPromote));
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CLASS_MEMBER_REMOVED", "CLASS_MEMBER", classId, null, member));
    }

    @Transactional
    @Override
    public void requestClassTransfer(Long userId, ClassTransferRequest request) {
        log.info("User {} requesting transfer for enrollment {} to class {}", userId, request.getEnrollmentId(), request.getNewClassId());

        EnrollmentEntity enrollment = enrollmentRepository.findById(request.getEnrollmentId())
                .orElseThrow(() -> ResourceNotFoundException.of("Enrollment", request.getEnrollmentId()));
        if (enrollment.getUserEntity() == null || !enrollment.getUserEntity().getId().equals(userId)) {
            throw new BusinessException("Enrollment does not belong to the requesting user.");
        }

        createApprovalRequest("CLASS_TRANSFER_REQUEST", request.getEnrollmentId(), userId,
                request.getReason() + " | newClassId:" + request.getNewClassId());
    }

    @Transactional
    @Override
    public void approveClassTransfer(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId) {
        log.info("Approving class transfer request: {}, approve: {}", approvalRequestId, approve);

        ApprovalRequestEntity req = getApprovalRequest(approvalRequestId);

        applyApprovalDecision(req, approve, rejectionReason);
        if (approve) {
            // Extract newClassId
            Long newClassId = null;
            if (req.getComment() != null && req.getComment().contains("newClassId:")) {
                String idStr = req.getComment().substring(req.getComment().indexOf("newClassId:") + 11).replaceAll("[^0-9]", "");
                if (!idStr.isEmpty()) {
                    newClassId = Long.parseLong(idStr);
                }
            }

            if (newClassId != null) {
                final Long targetClassId = newClassId;
                ClassEntity newClass = classRepository.findById(targetClassId)
                        .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, targetClassId));

                long activeCount = classMemberRepository.countById_ClassIdAndStatus(newClassId, ClassMemberStatusEnum.ACTIVE);
                if (activeCount >= newClass.getMaxMembers()) {
                    throw new BusinessException("Target class is full. Cannot complete transfer.");
                }

                // Remove from old class & promote waitlist
                EnrollmentEntity enrollment = enrollmentRepository.findById(req.getTargetId()).orElse(null);
                if (enrollment != null && req.getApproverId() != null) {
                    removeMemberAndPromoteWaitlist(enrollment.getCourseEntity().getId(), req.getApproverId());

                    // Add to new class
                    UserEntity student = userRepository.findById(req.getApproverId())
                            .orElseThrow(() -> ResourceNotFoundException.of("User", req.getApproverId()));
                    ClassMemberEntity newMem = ClassMemberEntity.builder()
                            .id(new ClassMemberId(newClassId, req.getApproverId()))
                            .classEntity(newClass)
                            .userEntity(student)
                            .roleInClass(ClassMemberRole.STUDENT)
                            .status(ClassMemberStatusEnum.ACTIVE)
                            .joinedAt(LocalDateTime.now())
                            .build();
                    classMemberRepository.save(newMem);
                }
            }
        }

        approvalRequestRepository.save(req);
    }

    @Transactional
    @Override
    public void requestTeacherChange(Long userId, TeacherChangeRequest request) {
        log.info("User {} requesting teacher change for enrollment {}", userId, request.getEnrollmentId());

        createApprovalRequest("TEACHER_CHANGE_REQUEST", request.getEnrollmentId(), userId, request.getReason());
    }

    @Transactional
    @Override
    public void approveTeacherChange(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId) {
        log.info("Approving teacher change request: {}, approve: {}", approvalRequestId, approve);
        ApprovalRequestEntity req = getApprovalRequest(approvalRequestId);

        applyApprovalDecision(req, approve, rejectionReason);
        approvalRequestRepository.save(req);
    }

    private void applyApprovalDecision(ApprovalRequestEntity request, boolean approve, String rejectionReason) {
        request.setStatus(approve ? ApprovalStatusEnum.CONFIRMED : ApprovalStatusEnum.REJECTED);
        request.setComment(approve ? request.getComment() : rejectionReason);
        request.setDecidedAt(LocalDateTime.now());
    }

    private void createApprovalRequest(String targetType, Long targetId, Long approverId, String comment) {
        ApprovalRequestEntity request = ApprovalRequestEntity.builder()
                .targetType(targetType)
                .targetId(targetId)
                .approverId(approverId)
                .comment(comment)
                .status(ApprovalStatusEnum.PENDING)
                .build();
        approvalRequestRepository.save(request);
    }

    private ApprovalRequestEntity getApprovalRequest(Long id) {
        return approvalRequestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("ApprovalRequest", id));
    }

    @Transactional
    @Override
    public void requestTeacherWithdrawal(Long teacherEmployeeId, Long classId, String reason) {
        log.info("Teacher employee {} requesting withdrawal from class {}", teacherEmployeeId, classId);

        EmployeeEntity teacherEmp = employeeRepository.findById(teacherEmployeeId)
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", teacherEmployeeId));

        ClassMemberEntity member = classMemberRepository.findById_ClassIdAndId_UserId(classId, teacherEmp.getUserEntity().getId())
                .orElseThrow(() -> ResourceNotFoundException.of("ClassMember", classId));

        member.setStatus(ClassMemberStatusEnum.REMOVED);
        member.setLeftAt(LocalDateTime.now());
        classMemberRepository.save(member);
    }

    @Transactional
    @Override
    public void rescheduleOnlineClass(Long classOnlineId, LocalDateTime newScheduledAt, Integer durationMin, Long teacherUserId) {
        log.info("Rescheduling online class {} to {}", classOnlineId, newScheduledAt);

        ClassOnlineEntity session = classOnlineRepository.findById(classOnlineId)
                .orElseThrow(() -> ResourceNotFoundException.of("ClassOnline", classOnlineId));

        session.setScheduledAt(newScheduledAt);
        if (durationMin != null) {
            session.setDurationMin(durationMin);
        }

        classOnlineRepository.save(session);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CLASS_ONLINE_RESCHEDULED", "CLASS_ONLINE", classOnlineId, null, session));
    }

    @Transactional
    @Override
    public void addTeacherAvailability(TeacherAvailabilityRequest request) {
        log.info("Adding availability for teacher employee: {} on day {}", request.getEmployeeId(), request.getDayOfWeek());

        EmployeeEntity employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> ResourceNotFoundException.of("Employee", request.getEmployeeId()));

        TeacherAvailabilityEntity availability = TeacherAvailabilityEntity.builder()
                .employeeEntity(employee)
                .dayOfWeek(request.getDayOfWeek())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(BaseStatusEnum.ACTIVE)
                .build();

        teacherAvailabilityRepository.save(availability);
    }
}
