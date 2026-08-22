package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.ClassStreamPostEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.enums.ClassStreamPostTypeEnum;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.ailms.entity.enums.SessionKindEnum;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.ClassStreamPostRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.OneOnOneRequestRepository;
import com.ailms.request.CancelClassSessionRequest;
import com.ailms.request.CreateClassOnlineRequest;
import com.ailms.request.ScheduleClassSessionRequest;
import com.ailms.response.ClassOnlineResponse;
import com.ailms.response.ClassSessionUsageResponse;
import com.ailms.service.IClassOnlineService;
import com.ailms.service.IClassSessionManagementService;
import com.ailms.service.INotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

/** Triển khai vòng đời buổi học, quota gói và thông báo cho lớp. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassSessionManagementService implements IClassSessionManagementService {

    private static final int MIN_CANCEL_NOTICE_MINUTES = 60;
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final ClassRepository classRepository;
    private final ClassOnlineRepository classOnlineRepository;
    private final CoursePackageRepository coursePackageRepository;
    private final OneOnOneRequestRepository oneOnOneRequestRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassStreamPostRepository classStreamPostRepository;
    private final IClassOnlineService classOnlineService;
    private final INotificationService notificationService;

    /** Tính quota từ gói và chỉ ghi nhận buổi đã kết thúc, đã có nhận xét. */
    @Override
    public ClassSessionUsageResponse getUsage(Long classId) {
        ClassEntity clazz = requireClass(classId);
        List<ClassOnlineEntity> sessions = classOnlineRepository.findByClassEntity_Id(classId);
        Integer total = resolveSessionLimit(clazz);
        long reviewed = sessions.stream().filter(this::isReviewedPackageSession).count();
        long scheduled = sessions.stream().filter(this::isUpcomingPackageSession).count();
        Integer remaining = total != null ? Math.max(total - Math.toIntExact(reviewed), 0) : null;
        return ClassSessionUsageResponse.builder().classId(classId).totalSessions(total)
                .reviewedSessions(reviewed).scheduledSessions(scheduled).remainingSessions(remaining)
                .packageLimitConfigured(total != null).classStatus(clazz.getStatus()).build();
    }

    /** Đặt lịch, giữ quota cho lịch chưa hủy và phát bảng tin/thông báo học viên. */
    @Override
    @Transactional
    public ClassOnlineResponse schedule(Long classId, Long actorUserId, ScheduleClassSessionRequest request) {
        ClassEntity clazz = requireClassForUpdate(classId);
        if (clazz.getStatus() != BaseStatusEnum.ACTIVE) {
            throw new BusinessException("Không thể đặt lịch cho lớp đã đóng hoặc ngừng hoạt động.");
        }
        ensureScheduleSlotAvailable(clazz);
        Long teacherId = resolveSessionTeacherId(classId, actorUserId);
        CreateClassOnlineRequest createRequest = CreateClassOnlineRequest.builder()
                .classId(classId).teacherId(teacherId).title(trimToNull(request.getTitle()))
                .meetingUrl(trimToNull(request.getMeetingUrl()))
                .meetingProvider(trimToNull(request.getMeetingProvider()))
                .scheduledAt(request.getScheduledAt()).durationMin(request.getDurationMin()).build();
        ClassOnlineResponse response = classOnlineService.create(createRequest);
        String displayTime = request.getScheduledAt().format(DISPLAY_TIME);
        createAnnouncement(clazz, actorUserId, "Đã đặt lịch học mới",
                "Buổi \"" + displayTitle(request.getTitle()) + "\" được đặt lúc " + displayTime + ".");
        notifyStudents(clazz, NotificationTypeEnum.CLASS_SESSION_SCHEDULED, "Lịch học mới",
                "Lớp " + clazz.getName() + " có buổi học mới lúc " + displayTime + ".", response.getId());
        return response;
    }

    /** Hủy lịch hợp lệ, lưu lý do và phát bảng tin/thông báo học viên. */
    @Override
    @Transactional
    public ClassOnlineResponse cancel(
            Long classId, Long sessionId, Long actorUserId, CancelClassSessionRequest request) {
        ClassOnlineEntity session = classOnlineRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> ResourceNotFoundException.of("ClassOnline", sessionId));
        if (!session.getClassEntity().getId().equals(classId)) {
            throw new BusinessException("Buổi học không thuộc lớp được yêu cầu.");
        }
        validateCancellation(session);
        String reason = request.getReason().trim();
        session.setStatus(BaseStatusEnum.CANCELLED);
        session.setCancellationReason(reason);
        session.setCancelledAt(LocalDateTime.now());
        session.setCancelledByUserId(actorUserId);
        classOnlineRepository.save(session);
        ClassEntity clazz = session.getClassEntity();
        String displayTime = session.getScheduledAt().format(DISPLAY_TIME);
        createAnnouncement(clazz, actorUserId, "Lịch học đã bị hủy",
                "Buổi \"" + displayTitle(session.getTitle()) + "\" lúc " + displayTime
                        + " đã bị hủy. Lý do: " + reason);
        notifyStudents(clazz, NotificationTypeEnum.CLASS_SESSION_CANCELLED, "Lịch học đã bị hủy",
                "Buổi học của lớp " + clazz.getName() + " lúc " + displayTime
                        + " đã bị hủy. Lý do: " + reason, sessionId);
        return classOnlineService.getById(sessionId);
    }

    /** Đóng lớp đúng lúc số buổi đã kết thúc và nhận xét đạt quota của gói. */
    @Override
    @Transactional
    public void sessionReviewed(Long classId) {
        ClassEntity clazz = requireClassForUpdate(classId);
        Integer total = resolveSessionLimit(clazz);
        if (total == null || total <= 0 || clazz.getStatus() == BaseStatusEnum.COMPLETED) return;
        long reviewed = classOnlineRepository.findByClassEntity_Id(classId).stream()
                .filter(this::isReviewedPackageSession).count();
        if (reviewed < total) return;
        clazz.setStatus(BaseStatusEnum.COMPLETED);
        clazz.setRegistrationOpen(false);
        clazz.setEndDate(LocalDateTime.now());
        classRepository.save(clazz);
    }

    /** Bảo đảm tổng lịch đang giữ chỗ không vượt số buổi của gói. */
    private void ensureScheduleSlotAvailable(ClassEntity clazz) {
        Integer total = resolveSessionLimit(clazz);
        if (total == null) return;
        long reserved = classOnlineRepository.findByClassEntity_Id(clazz.getId()).stream()
                .filter(this::isPackageSession).filter(session -> !isCancelled(session)).count();
        if (reserved >= total) throw new BusinessException("Số buổi đã đặt đạt giới hạn của gói học.");
    }

    /** Xác định giới hạn từ matching 1-1 hoặc gói gắn trực tiếp với lớp. */
    private Integer resolveSessionLimit(ClassEntity clazz) {
        Integer oneOnOneLimit = oneOnOneRequestRepository.findByTrialClassEntity_Id(clazz.getId())
                .map(item -> item.getEnrollmentPackageEntity().getCoursePackageEntity().getIncludedTutorSessions())
                .orElse(null);
        if (oneOnOneLimit != null && oneOnOneLimit > 0) return oneOnOneLimit;
        return coursePackageRepository.findByClassEntity_Id(clazz.getId()).stream()
                .map(CoursePackageEntity::getIncludedTutorSessions).filter(value -> value != null && value > 0)
                .max(Comparator.naturalOrder()).orElse(null);
    }

    /** Chỉ nhận buổi chính thức có trừ quota. */
    private boolean isPackageSession(ClassOnlineEntity session) {
        return session.getSessionKind() == SessionKindEnum.REGULAR
                && Boolean.TRUE.equals(session.getCountsTowardPackage());
    }

    /** Một buổi chỉ được tính đã dùng sau khi kết thúc và đã có nhận xét. */
    private boolean isReviewedPackageSession(ClassOnlineEntity session) {
        if (!isPackageSession(session) || isCancelled(session) || session.getScheduledAt() == null
                || session.getTeacherNotes() == null || session.getTeacherNotes().isBlank()) return false;
        int duration = session.getDurationMin() != null ? Math.max(session.getDurationMin(), 1) : 60;
        return !LocalDateTime.now().isBefore(session.getScheduledAt().plusMinutes(duration));
    }

    /** Đếm lịch tương lai đang giữ chỗ để hiển thị riêng với quota đã dùng. */
    private boolean isUpcomingPackageSession(ClassOnlineEntity session) {
        return isPackageSession(session) && !isCancelled(session) && session.getScheduledAt() != null
                && session.getScheduledAt().isAfter(LocalDateTime.now());
    }

    /** Nhận diện mọi trạng thái hủy/ngừng của dữ liệu cũ và mới. */
    private boolean isCancelled(ClassOnlineEntity session) {
        return session.getStatus() == BaseStatusEnum.CANCELLED
                || session.getStatus() == BaseStatusEnum.INACTIVE
                || session.getStatus() == BaseStatusEnum.DELETE
                || session.getStatus() == BaseStatusEnum.DELETED;
    }

    /** Kiểm tra buổi còn hiệu lực và còn ít nhất 60 phút trước giờ bắt đầu. */
    private void validateCancellation(ClassOnlineEntity session) {
        if (isCancelled(session)) throw new BusinessException("Buổi học đã được hủy trước đó.");
        if (session.getScheduledAt() == null) throw new BusinessException("Buổi học chưa có thời gian bắt đầu.");
        if (session.getScheduledAt().isBefore(LocalDateTime.now().plusMinutes(MIN_CANCEL_NOTICE_MINUTES))) {
            throw new BusinessException("Chỉ được hủy lịch trước giờ bắt đầu ít nhất 1 tiếng.");
        }
    }

    /** Tạo bài thông báo hệ thống trên bảng tin lớp. */
    private void createAnnouncement(ClassEntity clazz, Long actorUserId, String title, String content) {
        classStreamPostRepository.save(ClassStreamPostEntity.builder().classEntity(clazz)
                .authorUserId(actorUserId).type(ClassStreamPostTypeEnum.ANNOUNCEMENT)
                .title(title).content(content).build());
    }

    /** Gửi notification có deep-link tới toàn bộ học viên ACTIVE của lớp. */
    private void notifyStudents(
            ClassEntity clazz, NotificationTypeEnum type, String title, String content, Long sessionId) {
        String targetUrl = "/student/classes/" + clazz.getId() + "?tab=sessions";
        classMemberRepository.findById_ClassIdAndRoleInClassAndStatus(
                        clazz.getId(), ClassMemberRole.STUDENT, ClassMemberStatusEnum.ACTIVE)
                .forEach(member -> notificationService.createSystemNotification(
                        member.getUserEntity(), type, title, content, sessionId, targetUrl));
    }

    /** Dùng chính Teacher/TA đang gọi; staff hệ thống dùng giáo viên ACTIVE của lớp. */
    private Long resolveSessionTeacherId(Long classId, Long actorUserId) {
        var actorMember = classMemberRepository.findById_ClassIdAndId_UserId(classId, actorUserId)
                .filter(member -> member.getStatus() == ClassMemberStatusEnum.ACTIVE)
                .filter(member -> member.getRoleInClass() == ClassMemberRole.TEACHER
                        || member.getRoleInClass() == ClassMemberRole.TA);
        if (actorMember.isPresent()) return actorUserId;
        return classMemberRepository.findById_ClassIdAndRoleInClassInAndStatus(classId,
                        List.of(ClassMemberRole.TEACHER, ClassMemberRole.TA), ClassMemberStatusEnum.ACTIVE)
                .stream().sorted(Comparator.comparing(member -> member.getRoleInClass() != ClassMemberRole.TEACHER))
                .map(member -> member.getUserEntity().getId()).findFirst()
                .orElseThrow(() -> new BusinessException("Lớp chưa có giáo viên hoặc trợ giảng ACTIVE để đặt lịch."));
    }

    /** Tải lớp hoặc trả lỗi 404 chuẩn của hệ thống. */
    private ClassEntity requireClass(Long classId) {
        return classRepository.findById(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));
    }

    /** Khóa lớp trong các thao tác thay đổi quota để tránh đặt vượt gói đồng thời. */
    private ClassEntity requireClassForUpdate(Long classId) {
        return classRepository.findByIdForUpdate(classId)
                .orElseThrow(() -> ResourceNotFoundException.of("Class", classId));
    }

    /** Chuẩn hóa chuỗi tùy chọn trước khi ghi dữ liệu. */
    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Tạo tiêu đề mặc định rõ nghĩa khi người dùng không nhập. */
    private String displayTitle(String title) {
        return title == null || title.isBlank() ? "Buổi học online" : title.trim();
    }
}
