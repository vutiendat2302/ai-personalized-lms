package com.ailms.service.imp;

import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.service.ITeacherActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** Quét các buổi vừa kết thúc để phát đúng một activity notification cho người dạy. */
@Component
@RequiredArgsConstructor
public class TeacherSessionActivityScheduler {

    private final ClassOnlineRepository classOnlineRepository;
    private final ITeacherActivityService teacherActivityService;
    private final ClassMemberRepository classMemberRepository;

    /** Mỗi phút quét các session bắt đầu trong 12 giờ gần nhất và đã vừa kết thúc. */
    @Scheduled(fixedDelay = 60000)
    @Transactional(readOnly = true)
    public void publishCompletedSessions() {
        LocalDateTime now = LocalDateTime.now();
        classMemberRepository.findByRoleInClassAndStatusAndJoinedAtBetween(
                        ClassMemberRole.STUDENT, ClassMemberStatusEnum.ACTIVE, now.minusMinutes(10), now)
                .forEach(teacherActivityService::studentJoined);
        classOnlineRepository.findByScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(
                        now.minusHours(12), now).stream()
                .filter(this::isCompletedAndActive)
                .forEach(teacherActivityService::sessionCompleted);
    }

    /** Xác định session đã kết thúc và chưa bị hủy. */
    private boolean isCompletedAndActive(ClassOnlineEntity session) {
        if (session.getScheduledAt() == null || session.getStatus() == BaseStatusEnum.CANCELLED
                || session.getStatus() == BaseStatusEnum.INACTIVE || session.getStatus() == BaseStatusEnum.DELETE
                || session.getStatus() == BaseStatusEnum.DELETED) return false;
        int duration = session.getDurationMin() != null ? Math.max(session.getDurationMin(), 1) : 60;
        return !LocalDateTime.now().isBefore(session.getScheduledAt().plusMinutes(duration));
    }
}
