package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.event.ClassMemberLeftEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.DegreeRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.repository.UserRepository;
import com.ailms.event.AuditLogEvent;
import com.ailms.response.MemberDetailResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IClassMemberService;
import com.ailms.service.ITeacherActivityService;
import com.ailms.response.ClassMemberResponse;
import com.ailms.service.lock.CapacityLockStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class ClassMemberService implements IClassMemberService {

    private final ClassRepository classRepository;
    private final UserRepository userRepository;
    private final ClassMemberRepository classMemberRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EmployeeRepository employeeRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final DegreeRepository degreeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ITeacherActivityService teacherActivityService;

    @Qualifier("pessimisticLockStrategy")
    private final CapacityLockStrategy capacityLockStrategy;

    @Override
    @Transactional(readOnly = true)
    public List<ClassMemberResponse> getByUserId(Long userId) {
        return classMemberRepository.findById_UserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassMemberResponse> getByClassId(Long classId) {
        return classMemberRepository.findById_ClassId(classId).stream()
                .map(this::toResponse)
                .toList();
    }

    private ClassMemberResponse toResponse(ClassMemberEntity entity) {
        Long userId = entity.getUserEntity().getId();
        ClassMemberResponse.ClassMemberResponseBuilder builder = ClassMemberResponse.builder()
                .classId(entity.getClassEntity().getId())
                .className(entity.getClassEntity().getName())
                .userId(userId)
                .username(entity.getUserEntity().getUsername())
                .fullName(entity.getUserEntity().getFullName())
                .email(entity.getUserEntity().getEmail())
                .avatarUrl(entity.getUserEntity().getAvatarUrl())
                .roleInClass(entity.getRoleInClass())
                .status(entity.getStatus())
                .joinedAt(entity.getJoinedAt())
                .waitlistedAt(entity.getWaitlistedAt())
                .leftAt(entity.getLeftAt());

        studentProfileRepository.findById(userId).ifPresent(sp -> builder.studentCode(sp.getStudentCode()));
        employeeRepository.findById(userId).ifPresent(emp -> builder.employeeCode(emp.getEmployeeCode()));

        return builder.build();
    }

    @Override
    @Transactional
    public ClassMemberEntity join(Long classId, Long userId, ClassMemberRole role) {
        log.info("User {} attempting to join Class {}", userId, classId);
        capacityLockStrategy.acquireLock(classId);
        try {
            ClassEntity classEntity = classRepository.findById(classId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));
            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

            // Calculate current active members
            long activeCount = classMemberRepository.countById_ClassIdAndStatusAndRoleInClass(
                    classId,
                    ClassMemberStatusEnum.ACTIVE,
                    ClassMemberRole.STUDENT
            );

            // Determine capacity limit
            // ONE_ON_ONE (type = 1) is limited to 1 member. Group class (type = 0) is limited to maxMembers.
            int limit = Integer.MAX_VALUE;
            if (classEntity.getType() != null && classEntity.getType() == 1) {
                limit = 1;
            } else if (classEntity.getMaxMembers() != null && classEntity.getMaxMembers() > 0) {
                limit = classEntity.getMaxMembers();
            }

            ClassMemberStatusEnum newStatus;
            if (role != ClassMemberRole.STUDENT) {
                newStatus = ClassMemberStatusEnum.ACTIVE;
            } else if (activeCount < limit) {
                newStatus = ClassMemberStatusEnum.ACTIVE;
            } else {
                newStatus = ClassMemberStatusEnum.WAITLISTED;
            }

            Optional<ClassMemberEntity> existingOpt = classMemberRepository.findById_ClassIdAndId_UserId(classId, userId);
            ClassMemberEntity member;
            ClassMemberStatusEnum oldStatus = null;

            if (existingOpt.isPresent()) {
                member = existingOpt.get();
                oldStatus = member.getStatus();
                if (oldStatus != newStatus) {
                    if (!oldStatus.canTransitionTo(newStatus)) {
                        throw new BusinessException("Cannot transition class member from " + oldStatus + " to " + newStatus);
                    }
                    member.setStatus(newStatus);
                }
                if (newStatus == ClassMemberStatusEnum.ACTIVE) {
                    member.setJoinedAt(LocalDateTime.now());
                    member.setLeftAt(null);
                    member.setWaitlistedAt(null);
                } else {
                    member.setWaitlistedAt(LocalDateTime.now());
                    member.setJoinedAt(null);
                    member.setLeftAt(null);
                }
                member.setRoleInClass(role);
            } else {
                member = ClassMemberEntity.builder()
                        .id(new ClassMemberId(classId, userId))
                        .classEntity(classEntity)
                        .userEntity(user)
                        .roleInClass(role)
                        .status(newStatus)
                        .joinedAt(newStatus == ClassMemberStatusEnum.ACTIVE ? LocalDateTime.now() : null)
                        .waitlistedAt(newStatus == ClassMemberStatusEnum.WAITLISTED ? LocalDateTime.now() : null)
                        .build();
            }

            ClassMemberEntity saved = classMemberRepository.save(member);

            if (role == ClassMemberRole.STUDENT && newStatus == ClassMemberStatusEnum.ACTIVE
                    && oldStatus != ClassMemberStatusEnum.ACTIVE) {
                teacherActivityService.studentJoined(saved);
            }

            // Sync enrollment status
            if (role == ClassMemberRole.STUDENT) {
                syncEnrollmentOnJoin(userId, classEntity, newStatus);
            }

            // Write audit log
            eventPublisher.publishEvent(new AuditLogEvent(
                    this,
                    oldStatus == null ? "JOIN" : "REJOIN",
                    "ClassMember",
                    classId,
                    oldStatus == null ? null : oldStatus.toString(),
                    newStatus.toString()
            ));

            return saved;
        } finally {
            capacityLockStrategy.releaseLock(classId);
        }
    }

    @Override
    @Transactional
    public ClassMemberEntity leave(Long classId, Long userId, String reason) {
        log.info("User {} leaving Class {}", userId, classId);
        ClassMemberEntity member = classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                .orElseThrow(() -> new BusinessException("User is not a member of this class"));

        ClassMemberStatusEnum oldStatus = member.getStatus();
        if (!oldStatus.canTransitionTo(ClassMemberStatusEnum.REMOVED)) {
            throw new BusinessException("Cannot leave class from status: " + oldStatus);
        }

        member.setStatus(ClassMemberStatusEnum.REMOVED);
        member.setLeftAt(LocalDateTime.now());
        ClassMemberEntity saved = classMemberRepository.save(member);

        // Sync enrollment status to DROPPED
        syncEnrollmentOnLeave(userId, member.getClassEntity().getCourseEntity().getId());

        // Publish event for waitlist promotion
        if (member.getRoleInClass() == ClassMemberRole.STUDENT) {
            eventPublisher.publishEvent(new ClassMemberLeftEvent(this, classId));
        }

        // Audit log
        eventPublisher.publishEvent(new AuditLogEvent(this, "LEAVE", "ClassMember", classId, oldStatus.toString(), ClassMemberStatusEnum.REMOVED.toString()));

        return saved;
    }

    @Override
    @Transactional
    public void transfer(Long fromClassId, Long toClassId, Long userId) {
        log.info("Transferring user {} from class {} to class {}", userId, fromClassId, toClassId);

        // 1. Leave old class
        ClassMemberEntity oldMember = classMemberRepository.findById_ClassIdAndId_UserId(fromClassId, userId)
                .orElseThrow(() -> new BusinessException("User is not a member of old class"));

        ClassMemberStatusEnum oldStatus = oldMember.getStatus();
        oldMember.setStatus(ClassMemberStatusEnum.REMOVED);
        oldMember.setLeftAt(LocalDateTime.now());
        classMemberRepository.save(oldMember);

        // Audit log leave
        eventPublisher.publishEvent(new AuditLogEvent(this, "TRANSFER_LEAVE", "ClassMember", fromClassId, oldStatus.toString(), ClassMemberStatusEnum.REMOVED.toString()));

        // 2. Join new class
        ClassMemberEntity newMember = join(toClassId, userId, oldMember.getRoleInClass());

        // 3. Update enrollment class pointer
        Optional<EnrollmentEntity> enrollmentOpt = enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(
                userId, oldMember.getClassEntity().getCourseEntity().getId()
        );
        if (enrollmentOpt.isPresent()) {
            EnrollmentEntity enrollment = enrollmentOpt.get();
            ClassEntity newClass = classRepository.findById(toClassId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Class", toClassId));
            enrollment.setClassEntity(newClass);
            enrollmentRepository.save(enrollment);
        }

        // Publish left event to trigger promotion in old class
        eventPublisher.publishEvent(new ClassMemberLeftEvent(this, fromClassId));
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void promoteNextWaitlist(Long classId) {
        log.info("Promoting next waitlist for class {}", classId);
        capacityLockStrategy.acquireLock(classId);
        try {
            ClassEntity classEntity = classRepository.findById(classId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));

            // Check if there is capacity
            long activeCount = classMemberRepository.countById_ClassIdAndStatus(classId, ClassMemberStatusEnum.ACTIVE);
            int limit = Integer.MAX_VALUE;
            if (classEntity.getType() != null && classEntity.getType() == 1) {
                limit = 1;
            } else if (classEntity.getMaxMembers() != null && classEntity.getMaxMembers() > 0) {
                limit = classEntity.getMaxMembers();
            }

            if (activeCount >= limit) {
                log.info("Class {} is already at full capacity. No promotion.", classId);
                return;
            }

            // Get first waitlisted student
            List<ClassMemberEntity> waitlist = classMemberRepository.findById_ClassIdAndStatusOrderByWaitlistedAtAsc(
                    classId, ClassMemberStatusEnum.WAITLISTED
            );

            if (waitlist.isEmpty()) {
                log.info("Waitlist is empty for class {}", classId);
                return;
            }

            ClassMemberEntity candidate = waitlist.getFirst();
            candidate.setStatus(ClassMemberStatusEnum.ACTIVE);
            candidate.setJoinedAt(LocalDateTime.now());
            candidate.setWaitlistedAt(null);
            classMemberRepository.save(candidate);

            // Sync enrollment
            syncEnrollmentOnJoin(candidate.getId().getUserId(), classEntity, ClassMemberStatusEnum.ACTIVE);

            // Audit Log
            eventPublisher.publishEvent(new AuditLogEvent(this, "PROMOTED_FROM_WAITLIST", "ClassMember", classId, ClassMemberStatusEnum.WAITLISTED.toString(), ClassMemberStatusEnum.ACTIVE.toString()));
            log.info("User {} promoted from waitlist to ACTIVE in class {}", candidate.getId().getUserId(), classId);
        } finally {
            capacityLockStrategy.releaseLock(classId);
        }
    }

    @Override
    @Transactional
    public ClassMemberEntity rejoin(Long classId, Long userId) {
        log.info("User {} rejoining Class {}", userId, classId);
        ClassMemberEntity member = classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                .orElseThrow(() -> new BusinessException("User has no member history in this class"));

        return join(classId, userId, member.getRoleInClass());
    }

    private void syncEnrollmentOnJoin(Long userId, ClassEntity classEntity, ClassMemberStatusEnum newStatus) {
        Optional<EnrollmentEntity> enrollmentOpt = enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(
                userId, classEntity.getCourseEntity().getId()
        );
        if (enrollmentOpt.isPresent()) {
            EnrollmentEntity enrollment = enrollmentOpt.get();
            enrollment.setClassEntity(classEntity);
            if (newStatus == ClassMemberStatusEnum.ACTIVE) {
                enrollment.setStatus((byte) 1); // ACTIVE
            } else {
                enrollment.setStatus((byte) 0); // PENDING
            }
            enrollmentRepository.save(enrollment);
        }
    }

    private void syncEnrollmentOnLeave(Long userId, Long courseId) {
        Optional<EnrollmentEntity> enrollmentOpt = enrollmentRepository.findByUserEntity_IdAndCourseEntity_Id(
                userId, courseId
        );
        if (enrollmentOpt.isPresent()) {
            EnrollmentEntity enrollment = enrollmentOpt.get();
            enrollment.setStatus((byte) 3); // DROPPED
            enrollmentRepository.save(enrollment);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MemberDetailResponse getMemberDetail(Long classId, Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        ClassMemberEntity member = classMemberRepository.findById_ClassIdAndId_UserId(classId, userId)
                .orElse(null);

        MemberDetailResponse.MemberDetailResponseBuilder builder = MemberDetailResponse.builder()
                .userId(user.getId())
                .fullName(user.getFullName() != null ? user.getFullName() : user.getUsername())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .roleInClass(member != null ? member.getRoleInClass().name() : "STUDENT")
                .joinedAt(member != null ? member.getJoinedAt() : null)
                .degrees(Collections.emptyList());

        // Check if student
        studentProfileRepository.findById(userId).ifPresent(sp -> {
            builder.studentCode(sp.getStudentCode());
        });

        // Check if employee (teacher/TA)
        employeeRepository.findById(userId).ifPresent(emp -> {
            builder.employeeCode(emp.getEmployeeCode());
            if (emp.getDepartment() != null) {
                builder.departmentName(emp.getDepartment().getName());
            }
        });

        return builder.build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ClassMemberResponse> getMembersPage(Long classId, String keyword, String role, String status, int page, int size) {
        List<ClassMemberEntity> allMembers = classMemberRepository.findById_ClassId(classId);

        List<ClassMemberEntity> filtered = allMembers.stream().filter(m -> {
            if (status != null && !status.isBlank() && !m.getStatus().name().equalsIgnoreCase(status)) {
                return false;
            }
            if (role != null && !role.isBlank() && !m.getRoleInClass().name().equalsIgnoreCase(role)) {
                return false;
            }
            if (keyword != null && !keyword.isBlank()) {
                String kw = keyword.toLowerCase();
                UserEntity u = m.getUserEntity();
                String name = u != null ? (u.getFullName() != null ? u.getFullName().toLowerCase() : u.getUsername().toLowerCase()) : "";
                String email = u != null && u.getEmail() != null ? u.getEmail().toLowerCase() : "";
                return name.contains(kw) || email.contains(kw) || String.valueOf(m.getId().getUserId()).contains(kw);
            }
            return true;
        }).toList();

        int start = Math.min(page * size, filtered.size());
        int end = Math.min(start + size, filtered.size());
        List<ClassMemberResponse> pageContent = filtered.subList(start, end).stream()
                .map(this::toResponse)
                .toList();

        int totalPages = (int) Math.ceil((double) filtered.size() / size);

        return PageResponse.<ClassMemberResponse>builder()
                .content(pageContent)
                .pageNumber(page)
                .pageSize(size)
                .totalElements((long) filtered.size())
                .totalPages(totalPages)
                .first(page == 0)
                .last(page >= totalPages - 1)
                .build();
    }
}
