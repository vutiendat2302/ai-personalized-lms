package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.mapper.NotificationMapper;
import com.ailms.repository.*;
import com.ailms.response.NotificationResponse;
import com.ailms.service.ITeacherActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Đồng bộ sự kiện lớp học thành notification có deep-link cho Teacher/TA. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherActivityService implements ITeacherActivityService {

    private static final List<NotificationTypeEnum> ACTIVITY_TYPES = List.of(
            NotificationTypeEnum.CLASS_STUDENT_JOINED,
            NotificationTypeEnum.ASSIGNMENT_SUBMITTED,
            NotificationTypeEnum.QUIZ_SUBMITTED,
            NotificationTypeEnum.TEACHING_SESSION_COMPLETED,
            NotificationTypeEnum.SESSION_REVIEWED);

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final ClassMemberRepository classMemberRepository;
    private final ClassRepository classRepository;
    private final CourseTeacherRepository courseTeacherRepository;
    private final UserRepository userRepository;

    /** Phát sự kiện học viên vào lớp cho toàn bộ Teacher/TA ACTIVE của lớp. */
    @Override
    @Transactional
    public void studentJoined(ClassMemberEntity member) {
        if (member.getRoleInClass() != ClassMemberRole.STUDENT || member.getStatus() != ClassMemberStatusEnum.ACTIVE) return;
        String student = displayName(member.getUserEntity());
        String className = member.getClassEntity().getName();
        publishToClass(member.getClassEntity().getId(), NotificationTypeEnum.CLASS_STUDENT_JOINED,
                membershipEventId(member), "Học viên mới vào lớp",
                student + " vừa tham gia lớp " + className + ".",
                "/teacher/classes/" + member.getClassEntity().getId());
    }

    /** Phát sự kiện nộp assignment đến người dạy có quyền với assignment. */
    @Override
    @Transactional
    public void assignmentSubmitted(SubmissionEntity submission, AssignmentEntity assignment) {
        UserEntity student = userRepository.findById(submission.getUserId()).orElse(null);
        publishAssessment(assignment.getClassId(), assignment.getCourseId(), NotificationTypeEnum.ASSIGNMENT_SUBMITTED,
                submission.getId(), "Có bài tập mới nộp",
                displayName(student) + " vừa nộp bài “" + assignment.getTitle() + "”"
                        + (Boolean.TRUE.equals(submission.getIsLate()) ? " (nộp trễ)." : "."),
                "/teacher/grading?submissionId=" + submission.getId());
    }

    /** Phát sự kiện nộp quiz/bài thi đến người dạy có quyền với quiz. */
    @Override
    @Transactional
    public void quizSubmitted(QuizAttemptEntity attempt, QuizEntity quiz) {
        UserEntity student = userRepository.findById(attempt.getUserId()).orElse(null);
        publishAssessment(quiz.getClassId(), quiz.getCourseId(), NotificationTypeEnum.QUIZ_SUBMITTED,
                attempt.getId(), "Học viên vừa nộp quiz/bài thi",
                displayName(student) + " vừa nộp “" + quiz.getTitle() + "” (lần " + attempt.getAttemptNumber() + ").",
                "/teacher/grading?attemptId=" + attempt.getId());
    }

    /** Phát sự kiện kết thúc buổi dạy và deep-link tới lịch. */
    @Override
    @Transactional
    public void sessionCompleted(ClassOnlineEntity session) {
        publishToClass(session.getClassEntity().getId(), NotificationTypeEnum.TEACHING_SESSION_COMPLETED,
                session.getId(), "Buổi dạy đã hoàn thành",
                "Buổi “" + session.getTitle() + "” của lớp " + session.getClassEntity().getName()
                        + " đã kết thúc và đang chờ nhận xét.",
                "/teacher/schedule?sessionId=" + session.getId());
    }

    /** Ghi activity nhận xét cho chính reviewer với deep-link tới session. */
    @Override
    @Transactional
    public void sessionReviewed(Long reviewerId, ClassOnlineEntity session) {
        publish(Set.of(reviewerId), NotificationTypeEnum.SESSION_REVIEWED, session.getId(),
                "Đã nhận xét buổi học",
                "Bạn đã hoàn tất nhận xét buổi “" + session.getTitle() + "” của lớp "
                        + session.getClassEntity().getName() + ".",
                "/teacher/schedule?sessionId=" + session.getId());
    }

    /** Trả activity mới nhất, hard-limit 5 theo yêu cầu dashboard. */
    @Override
    public List<NotificationResponse> getLatest(Long userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 5));
        return notificationRepository.findByUserIdAndTypeInOrderByCreatedAtDesc(
                        userId, ACTIVITY_TYPES, PageRequest.of(0, safeLimit)).stream()
                .map(notificationMapper::toResponse).toList();
    }

    /** Chọn người nhận theo lớp riêng hoặc toàn bộ lớp/owner của course chung. */
    private void publishAssessment(Long classId, Long courseId, NotificationTypeEnum type, Long targetId,
                                   String title, String content, String targetUrl) {
        if (classId != null) {
            publishToClass(classId, type, targetId, title, content, targetUrl);
            return;
        }
        LinkedHashSet<Long> recipients = new LinkedHashSet<>();
        if (courseId != null) {
            courseTeacherRepository.findByCourseEntity_IdAndStatus(courseId, CourseTeacherStatusEnum.ACTIVE)
                    .forEach(item -> recipients.add(item.getUserEntity().getId()));
            classRepository.findByCourseEntity_Id(courseId).forEach(clazz -> recipients.addAll(classTeacherIds(clazz.getId())));
        }
        publish(recipients, type, targetId, title, content, targetUrl);
    }

    /** Phát notification tới tất cả người dạy ACTIVE trong lớp. */
    private void publishToClass(Long classId, NotificationTypeEnum type, Long targetId,
                                String title, String content, String targetUrl) {
        publish(classTeacherIds(classId), type, targetId, title, content, targetUrl);
    }

    /** Lấy ID Teacher/TA ACTIVE của lớp. */
    private Set<Long> classTeacherIds(Long classId) {
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(classId,
                List.of(ClassMemberRole.TEACHER, ClassMemberRole.TA), ClassMemberStatusEnum.ACTIVE)
                .forEach(item -> ids.add(item.getUserEntity().getId()));
        return ids;
    }

    /** Lưu notification idempotent theo user, type và target nghiệp vụ. */
    private void publish(Set<Long> recipients, NotificationTypeEnum type, Long targetId,
                         String title, String content, String targetUrl) {
        for (Long recipientId : recipients) {
            if (notificationRepository.existsByUserIdAndTypeAndTargetId(recipientId, type, targetId)) continue;
            userRepository.findById(recipientId).ifPresent(user -> notificationRepository.save(NotificationEntity.builder()
                    .user(user).source(NotificationSourceEnum.SYSTEM).type(type).title(title).content(content)
                    .targetId(targetId).targetUrl(targetUrl).isRead(false).build()));
        }
    }

    /** Lấy tên hiển thị ổn định, kể cả khi fullName trống. */
    private String displayName(UserEntity user) {
        if (user == null) return "Học viên";
        return user.getFullName() != null && !user.getFullName().isBlank() ? user.getFullName() : user.getUsername();
    }

    /** Tạo target kỹ thuật ổn định từ classId và studentId để chống trùng giữa các lớp. */
    private Long membershipEventId(ClassMemberEntity member) {
        return member.getClassEntity().getId() ^ Long.rotateLeft(member.getUserEntity().getId(), 17);
    }
}
