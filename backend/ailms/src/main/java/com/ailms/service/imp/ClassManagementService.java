package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.ClassMapper;
import com.ailms.mapper.CoursePackageMapper;
import com.ailms.repository.*;
import com.ailms.request.*;
import com.ailms.response.ClassResponse;
import com.ailms.response.CoursePackageResponse;
import com.ailms.service.IClassManagementService;
import com.ailms.service.IEmailService;
import com.ailms.service.ITeacherMatchingService;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
    private final CoursePackageMapper coursePackageMapper;
    private final IEmailService emailService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final JsonMapper objectMapper;

    private static final String RESOURCE_NAME = "Class";

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

            if (teacherMatchingService.checkScheduleCollision(request.getTeacherEmployeeId(), request.getSchedules())) {
                throw new BusinessException("Selected teacher has a schedule collision during requested time slots.");
            }
        }

        ClassEntity clazz = ClassEntity.builder()
                .courseEntity(course)
                .categoryEntity(category)
                .name(request.getName())
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
        return classMapper.toResponse(savedClass);
    }

    @Transactional
    @Override
    public CoursePackageResponse createCoursePackage(CreateCoursePackageRequest request) {
        log.info("Creating course package: {} for course: {}", request.getName(), request.getCourseId());

        CourseEntity course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> ResourceNotFoundException.of("Course", request.getCourseId()));

        ClassEntity clazz = null;

        if (request.getDeliveryMode() == DeliveryModeEnum.GROUP_CLASS) {
            if (request.getClassId() == null) {
                throw new BusinessException("GROUP_CLASS package requires a pre-created READY classId.");
            }
            clazz = classRepository.findById(request.getClassId())
                    .orElseThrow(() -> ResourceNotFoundException.of("Class", request.getClassId()));

            if (!clazz.getCourseEntity().getId().equals(request.getCourseId())) {
                throw new BusinessException("Class does not belong to course: " + request.getCourseId());
            }
        }

        CoursePackageEntity pkg = CoursePackageEntity.builder()
                .courseEntity(course)
                .classEntity(clazz)
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .durationDays(request.getDurationDays())
                .deliveryMode(request.getDeliveryMode())
                .status(CoursePackageStatusEnum.ACTIVE)
                .build();

        CoursePackageEntity saved = coursePackageRepository.save(pkg);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_COURSE_PACKAGE", "COURSE_PACKAGE", saved.getId(), null, saved));
        return coursePackageMapper.toResponse(saved);
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
            // 9.4 1-1 Tutor Matching & Dynamic Class Creation
            List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots = null;
            if (requestedScheduleJson != null && !requestedScheduleJson.trim().isEmpty()) {
                try {
                    requestedSlots = objectMapper.readValue(requestedScheduleJson, new TypeReference<List<CreateGroupClassRequest.ScheduleSlotRequest>>() {});
                } catch (Exception e) {
                    log.error("Failed to parse requestedScheduleJson", e);
                }
            }

            Long categoryId = pkg.getCourseEntity().getCategoryEntity() != null ? pkg.getCourseEntity().getCategoryEntity().getId() : 1L;
            Optional<EmployeeEntity> matchedTeacher = teacherMatchingService.matchTeacherFor1on1(categoryId, requestedSlots);

            if (matchedTeacher.isPresent()) {
                EmployeeEntity teacher = matchedTeacher.get();
                ClassEntity new1on1Class = ClassEntity.builder()
                        .courseEntity(pkg.getCourseEntity())
                        .categoryEntity(pkg.getCourseEntity().getCategoryEntity())
                        .name("1-1 Tutor: " + pkg.getCourseEntity().getName() + " (" + user.getUsername() + ")")
                        .packageType(DeliveryModeEnum.ONE_ON_ONE)
                        .maxMembers(1)
                        .currentMemberCount(1)
                        .status(BaseStatusEnum.ACTIVE)
                        .startDate(LocalDateTime.now())
                        .build();

                ClassEntity saved1on1 = classRepository.save(new1on1Class);

                // Add teacher & student to class_member
                ClassMemberEntity teacherMem = ClassMemberEntity.builder()
                        .id(new ClassMemberId(saved1on1.getId(), teacher.getUserEntity().getId()))
                        .classEntity(saved1on1)
                        .userEntity(teacher.getUserEntity())
                        .roleInClass(ClassMemberRole.TEACHER)
                        .status(ClassMemberStatusEnum.ACTIVE)
                        .joinedAt(LocalDateTime.now())
                        .build();
                classMemberRepository.save(teacherMem);

                ClassMemberEntity studentMem = ClassMemberEntity.builder()
                        .id(new ClassMemberId(saved1on1.getId(), userId))
                        .classEntity(saved1on1)
                        .userEntity(user)
                        .roleInClass(ClassMemberRole.STUDENT)
                        .status(ClassMemberStatusEnum.ACTIVE)
                        .joinedAt(LocalDateTime.now())
                        .build();
                classMemberRepository.save(studentMem);

                // Save schedule
                if (requestedSlots != null) {
                    for (CreateGroupClassRequest.ScheduleSlotRequest slot : requestedSlots) {
                        ClassScheduleEntity sched = ClassScheduleEntity.builder()
                                .classEntity(saved1on1)
                                .dayOfWeek(slot.getDayOfWeek())
                                .startTime(slot.getStartTime())
                                .endTime(slot.getEndTime())
                                .status(BaseStatusEnum.ACTIVE)
                                .build();
                        classScheduleRepository.save(sched);
                    }
                }
            } else {
                // Pending HR matching
                enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(userId, pkg.getCourseEntity().getId())
                        .ifPresent(en -> {
                            en.setStatus((byte) 2); // PENDING_MATCHING
                            enrollmentRepository.save(en);
                        });
            }
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
            ClassMemberEntity toPromote = waitlisted.get(0);
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

        ApprovalRequestEntity approvalReq = ApprovalRequestEntity.builder()
                .targetType("CLASS_TRANSFER_REQUEST")
                .targetId(request.getEnrollmentId())
                .approverId(userId)
                .comment(request.getReason() + " | newClassId:" + request.getNewClassId())
                .status(ApprovalStatusEnum.PENDING)
                .build();

        approvalRequestRepository.save(approvalReq);
    }

    @Transactional
    @Override
    public void approveClassTransfer(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId) {
        log.info("Approving class transfer request: {}, approve: {}", approvalRequestId, approve);

        ApprovalRequestEntity req = approvalRequestRepository.findById(approvalRequestId)
                .orElseThrow(() -> ResourceNotFoundException.of("ApprovalRequest", approvalRequestId));

        if (approve) {
            req.setStatus(ApprovalStatusEnum.CONFIRMED);
            req.setDecidedAt(LocalDateTime.now());
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
                    ClassMemberEntity newMem = ClassMemberEntity.builder()
                            .id(new ClassMemberId(newClassId, req.getApproverId()))
                            .classEntity(newClass)
                            .userEntity(userRepository.findById(req.getApproverId()).get())
                            .roleInClass(ClassMemberRole.STUDENT)
                            .status(ClassMemberStatusEnum.ACTIVE)
                            .joinedAt(LocalDateTime.now())
                            .build();
                    classMemberRepository.save(newMem);
                }
            }
        } else {
            req.setStatus(ApprovalStatusEnum.REJECTED);
            req.setComment(rejectionReason);
            req.setDecidedAt(LocalDateTime.now());
        }

        approvalRequestRepository.save(req);
    }

    @Transactional
    @Override
    public void requestTeacherChange(Long userId, TeacherChangeRequest request) {
        log.info("User {} requesting teacher change for enrollment {}", userId, request.getEnrollmentId());

        ApprovalRequestEntity approvalReq = ApprovalRequestEntity.builder()
                .targetType("TEACHER_CHANGE_REQUEST")
                .targetId(request.getEnrollmentId())
                .approverId(userId)
                .comment(request.getReason())
                .status(ApprovalStatusEnum.PENDING)
                .build();

        approvalRequestRepository.save(approvalReq);
    }

    @Transactional
    @Override
    public void approveTeacherChange(Long approvalRequestId, boolean approve, String rejectionReason, Long adminUserId) {
        log.info("Approving teacher change request: {}, approve: {}", approvalRequestId, approve);
        ApprovalRequestEntity req = approvalRequestRepository.findById(approvalRequestId)
                .orElseThrow(() -> ResourceNotFoundException.of("ApprovalRequest", approvalRequestId));

        if (approve) {
            req.setStatus(ApprovalStatusEnum.CONFIRMED);
            req.setDecidedAt(LocalDateTime.now());
            // Dynamic re-match logic for 1-1 tutor
        } else {
            req.setStatus(ApprovalStatusEnum.REJECTED);
            req.setComment(rejectionReason);
            req.setDecidedAt(LocalDateTime.now());
        }

        approvalRequestRepository.save(req);
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
