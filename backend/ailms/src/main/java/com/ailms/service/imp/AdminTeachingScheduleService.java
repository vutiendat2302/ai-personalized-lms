package com.ailms.service.imp;

import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.request.UpdateAdminTeachingScheduleRequest;
import com.ailms.response.AdminTeachingScheduleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTeachingScheduleService {
    private final ClassOnlineRepository classOnlineRepository;
    private final ClassMemberRepository classMemberRepository;

    public List<AdminTeachingScheduleResponse> getSchedule(LocalDateTime from, LocalDateTime to) {
        List<ClassOnlineEntity> sessions = classOnlineRepository
                .findByScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(from, to);
        List<Long> classIds = sessions.stream().map(item -> item.getClassEntity().getId()).distinct().toList();
        Map<Long, List<ClassMemberEntity>> membersByClass = classIds.isEmpty() ? Map.of() :
                classMemberRepository.findById_ClassIdInAndStatus(classIds, ClassMemberStatusEnum.ACTIVE).stream()
                        .collect(java.util.stream.Collectors.groupingBy(member -> member.getClassEntity().getId()));

        return sessions.stream().map(session -> toResponse(session, membersByClass)).toList();
    }

    public AdminTeachingScheduleResponse getDetail(Long id) {
        ClassOnlineEntity session = findSession(id);
        return toResponse(session, membersForClasses(List.of(session.getClassEntity().getId())));
    }

    @Transactional
    public AdminTeachingScheduleResponse update(Long id, UpdateAdminTeachingScheduleRequest request) {
        ClassOnlineEntity session = findSession(id);
        if (session.getStatus() == BaseStatusEnum.INACTIVE || session.getStatus() == BaseStatusEnum.DELETED) {
            throw new BusinessException("Lịch dạy đã bị hủy, không thể chỉnh sửa.");
        }
        if (request.getStatus() == BaseStatusEnum.ACTIVE) {
            validateNoConflict(session, request.getScheduledAt(), request.getDurationMin());
        }
        session.setTitle(request.getTitle() == null ? null : request.getTitle().trim());
        session.setScheduledAt(request.getScheduledAt());
        session.setDurationMin(request.getDurationMin());
        session.setMeetingUrl(request.getMeetingUrl() == null ? null : request.getMeetingUrl().trim());
        session.setStatus(request.getStatus());
        ClassOnlineEntity saved = classOnlineRepository.save(session);
        return toResponse(saved, membersForClasses(List.of(saved.getClassEntity().getId())));
    }

    @Transactional
    public void delete(Long id) {
        ClassOnlineEntity session = findSession(id);
        if (session.getStatus() == BaseStatusEnum.INACTIVE) {
            throw new BusinessException("Lịch dạy này đã được hủy trước đó.");
        }
        session.setStatus(BaseStatusEnum.INACTIVE);
        classOnlineRepository.save(session);
    }

    private void validateNoConflict(ClassOnlineEntity session, LocalDateTime proposedStart, int durationMin) {
        LocalDateTime proposedEnd = proposedStart.plusMinutes(durationMin);
        Set<Long> resourceIds = resourceIds(session);
        if (resourceIds.isEmpty()) return;
        List<ClassOnlineEntity> candidates = classOnlineRepository
                .findPotentialConflicts(proposedStart.minusHours(12), proposedEnd, session.getId());
        for (ClassOnlineEntity candidate : candidates) {
            int candidateDuration = Optional.ofNullable(candidate.getDurationMin()).filter(value -> value > 0).orElse(90);
            if (!candidate.getScheduledAt().plusMinutes(candidateDuration).isAfter(proposedStart)) continue;
            Set<Long> candidateIds = resourceIds(candidate);
            Optional<Long> conflictId = resourceIds.stream().filter(candidateIds::contains).findFirst();
            if (conflictId.isPresent()) {
                String person = resourceName(session, conflictId.get());
                throw new BusinessException(person + " đang có lịch ‘"
                        + Optional.ofNullable(candidate.getTitle()).orElse(candidate.getClassEntity().getName())
                        + "’ từ " + candidate.getScheduledAt() + ". Vui lòng chọn thời gian khác.");
            }
        }
    }

    private Set<Long> resourceIds(ClassOnlineEntity session) {
        Set<Long> ids = new LinkedHashSet<>();
        if (session.getTeacherEntity() != null) ids.add(session.getTeacherEntity().getId());
        classMemberRepository.findById_ClassIdInAndStatus(
                        List.of(session.getClassEntity().getId()), ClassMemberStatusEnum.ACTIVE).stream()
                .filter(member -> member.getRoleInClass() == ClassMemberRole.TEACHER
                        || member.getRoleInClass() == ClassMemberRole.TA)
                .map(member -> member.getUserEntity().getId()).forEach(ids::add);
        return ids;
    }

    private String resourceName(ClassOnlineEntity session, Long userId) {
        if (session.getTeacherEntity() != null && userId.equals(session.getTeacherEntity().getId())) {
            return Optional.ofNullable(session.getTeacherEntity().getFullName()).orElse("Teacher/TA");
        }
        return classMemberRepository.findById_ClassIdInAndStatus(
                        List.of(session.getClassEntity().getId()), ClassMemberStatusEnum.ACTIVE).stream()
                .map(ClassMemberEntity::getUserEntity).filter(user -> userId.equals(user.getId()))
                .map(UserEntity::getFullName).filter(Objects::nonNull).findFirst().orElse("Teacher/TA");
    }

    private ClassOnlineEntity findSession(Long id) {
        return classOnlineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch dạy: " + id));
    }

    private Map<Long, List<ClassMemberEntity>> membersForClasses(List<Long> classIds) {
        return classIds.isEmpty() ? Map.of() :
                classMemberRepository.findById_ClassIdInAndStatus(classIds, ClassMemberStatusEnum.ACTIVE).stream()
                        .collect(java.util.stream.Collectors.groupingBy(member -> member.getClassEntity().getId()));
    }

    private AdminTeachingScheduleResponse toResponse(ClassOnlineEntity session,
            Map<Long, List<ClassMemberEntity>> membersByClass) {
            Map<Long, AdminTeachingScheduleResponse.TeachingResource> resources = new LinkedHashMap<>();
            for (ClassMemberEntity member : membersByClass.getOrDefault(session.getClassEntity().getId(), List.of())) {
                if (member.getRoleInClass() != ClassMemberRole.TEACHER
                        && member.getRoleInClass() != ClassMemberRole.TA) continue;
                UserEntity user = member.getUserEntity();
                resources.put(user.getId(), toResource(user, member.getRoleInClass().name()));
            }
            if (session.getTeacherEntity() != null) {
                resources.putIfAbsent(session.getTeacherEntity().getId(), toResource(session.getTeacherEntity(), "TEACHER"));
            }
            LocalDateTime startAt = session.getScheduledAt();
            int duration = Optional.ofNullable(session.getDurationMin()).filter(value -> value > 0).orElse(90);
            return AdminTeachingScheduleResponse.builder()
                    .id(session.getId())
                    .classId(session.getClassEntity().getId())
                    .className(session.getClassEntity().getName())
                    .courseName(session.getClassEntity().getCourseEntity() == null ? null : session.getClassEntity().getCourseEntity().getName())
                    .title(session.getTitle())
                    .startAt(startAt)
                    .endAt(startAt == null ? null : startAt.plusMinutes(duration))
                    .status(session.getStatus() == null ? null : session.getStatus().name())
                    .deliveryMode(session.getClassEntity().getPackageType() == null ? null : session.getClassEntity().getPackageType().name())
                    .meetingUrl(session.getMeetingUrl())
                    .resources(new ArrayList<>(resources.values()))
                    .students(membersByClass.getOrDefault(session.getClassEntity().getId(), List.of()).stream()
                            .filter(member -> member.getRoleInClass() == ClassMemberRole.STUDENT)
                            .map(member -> AdminTeachingScheduleResponse.StudentSummary.builder()
                                    .userId(member.getUserEntity().getId())
                                    .fullName(member.getUserEntity().getFullName())
                                    .email(member.getUserEntity().getEmail())
                                    .phone(member.getUserEntity().getPhone())
                                    .joinedAt(member.getJoinedAt())
                                    .build())
                            .sorted(Comparator.comparing(student -> Optional.ofNullable(student.getFullName()).orElse("")))
                            .toList())
                    .build();
    }

    private AdminTeachingScheduleResponse.TeachingResource toResource(UserEntity user, String role) {
        return AdminTeachingScheduleResponse.TeachingResource.builder()
                .userId(user.getId()).fullName(user.getFullName()).email(user.getEmail()).role(role).build();
    }
}
