package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassOnlineEntity;
import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.SessionKindEnum;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.ailms.exception.BusinessException;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassOnlineRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.ClassStreamPostRepository;
import com.ailms.repository.CoursePackageRepository;
import com.ailms.repository.OneOnOneRequestRepository;
import com.ailms.request.CancelClassSessionRequest;
import com.ailms.response.ClassSessionUsageResponse;
import com.ailms.response.ClassOnlineResponse;
import com.ailms.service.IClassOnlineService;
import com.ailms.service.INotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra invariant quota nhận xét và thời hạn hủy lịch. */
@ExtendWith(MockitoExtension.class)
class ClassSessionManagementServiceTest {

    @Mock private ClassRepository classRepository;
    @Mock private ClassOnlineRepository classOnlineRepository;
    @Mock private CoursePackageRepository coursePackageRepository;
    @Mock private OneOnOneRequestRepository oneOnOneRequestRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private ClassStreamPostRepository classStreamPostRepository;
    @Mock private IClassOnlineService classOnlineService;
    @Mock private INotificationService notificationService;

    private ClassSessionManagementService service;
    private ClassEntity clazz;

    /** Khởi tạo service và lớp dùng chung cho từng test. */
    @BeforeEach
    void setUp() {
        service = new ClassSessionManagementService(classRepository, classOnlineRepository,
                coursePackageRepository, oneOnOneRequestRepository, classMemberRepository,
                classStreamPostRepository, classOnlineService, notificationService);
        clazz = ClassEntity.builder().id(10L).name("Lớp A").status(BaseStatusEnum.ACTIVE).build();
    }

    /** Buổi đã kết thúc nhưng chưa nhận xét không làm giảm số buổi còn lại. */
    @Test
    void usageOnlyCountsEndedReviewedSessions() {
        stubPackageQuota(false);
        ClassOnlineEntity reviewed = endedSession(1L, "Đã nhận xét");
        ClassOnlineEntity unreviewed = endedSession(2L, null);
        ClassOnlineEntity upcoming = ClassOnlineEntity.builder().id(3L).classEntity(clazz)
                .scheduledAt(LocalDateTime.now().plusDays(1)).durationMin(60)
                .sessionKind(SessionKindEnum.REGULAR).countsTowardPackage(true)
                .status(BaseStatusEnum.ACTIVE).build();
        when(classOnlineRepository.findByClassEntity_Id(10L))
                .thenReturn(List.of(reviewed, unreviewed, upcoming));

        ClassSessionUsageResponse usage = service.getUsage(10L);

        assertThat(usage.getReviewedSessions()).isEqualTo(1);
        assertThat(usage.getRemainingSessions()).isEqualTo(2);
        assertThat(usage.getScheduledSessions()).isEqualTo(1);
    }

    /** Lớp tự chuyển COMPLETED ngay khi nhận xét cuối cùng chạm quota. */
    @Test
    void closesClassWhenReviewedSessionsReachPackageLimit() {
        stubPackageQuota(true);
        when(classOnlineRepository.findByClassEntity_Id(10L)).thenReturn(List.of(
                endedSession(1L, "Nhận xét 1"), endedSession(2L, "Nhận xét 2"),
                endedSession(3L, "Nhận xét 3")));

        service.sessionReviewed(10L);

        assertThat(clazz.getStatus()).isEqualTo(BaseStatusEnum.COMPLETED);
        assertThat(clazz.getRegistrationOpen()).isFalse();
        verify(classRepository).save(clazz);
    }

    /** Từ chối hủy khi thời gian báo trước ngắn hơn một tiếng. */
    @Test
    void rejectsCancellationLessThanOneHourBeforeStart() {
        ClassOnlineEntity session = ClassOnlineEntity.builder().id(20L).classEntity(clazz)
                .scheduledAt(LocalDateTime.now().plusMinutes(59)).durationMin(60)
                .status(BaseStatusEnum.ACTIVE).build();
        when(classOnlineRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(session));
        CancelClassSessionRequest request = new CancelClassSessionRequest();
        request.setReason("Giảng viên bận đột xuất");

        assertThatThrownBy(() -> service.cancel(10L, 20L, 1L, request))
                .isInstanceOf(BusinessException.class).hasMessageContaining("ít nhất 1 tiếng");
        verify(classOnlineRepository, never()).save(any());
    }

    /** Hủy hợp lệ lưu lý do, tạo bảng tin và gửi notification cho học viên ACTIVE. */
    @Test
    void cancellationPublishesAnnouncementAndStudentNotification() {
        ClassOnlineEntity session = ClassOnlineEntity.builder().id(20L).classEntity(clazz)
                .title("Ôn tập").scheduledAt(LocalDateTime.now().plusHours(2)).durationMin(60)
                .status(BaseStatusEnum.ACTIVE).build();
        UserEntity student = UserEntity.builder().id(5L).fullName("Học viên").build();
        ClassMemberEntity member = ClassMemberEntity.builder().classEntity(clazz).userEntity(student)
                .roleInClass(ClassMemberRole.STUDENT).status(ClassMemberStatusEnum.ACTIVE).build();
        when(classOnlineRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(session));
        when(classMemberRepository.findById_ClassIdAndRoleInClassAndStatus(
                10L, ClassMemberRole.STUDENT, ClassMemberStatusEnum.ACTIVE)).thenReturn(List.of(member));
        when(classOnlineService.getById(20L)).thenReturn(ClassOnlineResponse.builder().id(20L).build());
        CancelClassSessionRequest request = new CancelClassSessionRequest();
        request.setReason("Giảng viên bận đột xuất");

        service.cancel(10L, 20L, 1L, request);

        assertThat(session.getStatus()).isEqualTo(BaseStatusEnum.CANCELLED);
        assertThat(session.getCancellationReason()).isEqualTo("Giảng viên bận đột xuất");
        verify(classStreamPostRepository).save(any());
        verify(notificationService).createSystemNotification(student,
                NotificationTypeEnum.CLASS_SESSION_CANCELLED, "Lịch học đã bị hủy",
                "Buổi học của lớp Lớp A lúc " + session.getScheduledAt().format(
                        java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"))
                        + " đã bị hủy. Lý do: Giảng viên bận đột xuất",
                20L, "/student/classes/10?tab=sessions");
    }

    /** Tạo buổi chính thức đã kết thúc với nhận xét tùy chọn. */
    private ClassOnlineEntity endedSession(Long id, String note) {
        return ClassOnlineEntity.builder().id(id).classEntity(clazz)
                .scheduledAt(LocalDateTime.now().minusHours(2)).durationMin(60)
                .sessionKind(SessionKindEnum.REGULAR).countsTowardPackage(true)
                .teacherNotes(note).status(BaseStatusEnum.ACTIVE).build();
    }

    /** Cấu hình repository trả lớp và gói giới hạn ba buổi. */
    private void stubPackageQuota(boolean lockClass) {
        CoursePackageEntity coursePackage = CoursePackageEntity.builder().id(30L)
                .classEntity(clazz).includedTutorSessions(3).build();
        if (lockClass) when(classRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(clazz));
        else when(classRepository.findById(10L)).thenReturn(Optional.of(clazz));
        when(oneOnOneRequestRepository.findByTrialClassEntity_Id(10L)).thenReturn(Optional.empty());
        when(coursePackageRepository.findByClassEntity_Id(10L)).thenReturn(List.of(coursePackage));
    }
}
