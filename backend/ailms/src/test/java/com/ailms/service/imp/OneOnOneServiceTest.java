package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ClassKindEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.OneOnOneRequestStatusEnum;
import com.ailms.repository.*;
import com.ailms.request.OneOnOneTrialClassRequest;
import com.ailms.service.INotificationService;
import com.ailms.service.IOrderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** Kiểm thử các transition HR mới trong matching 1-1. */
@ExtendWith(MockitoExtension.class)
class OneOnOneServiceTest {
    @Mock private OneOnOneRequestRepository requestRepository;
    @Mock private OneOnOneRejectedInstructorRepository rejectedInstructorRepository;
    @Mock private TeacherCategoryRepository teacherCategoryRepository;
    @Mock private ClassRepository classRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private ClassOnlineRepository classOnlineRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private INotificationService notificationService;
    @Mock private IOrderService orderService;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks private OneOnOneService service;

    /** HR xác nhận kết nối phải tạo lớp, thành viên và buổi học thử ngay trong cùng luồng. */
    @Test
    void markContactedCreatesTrialClassAndSession() {
        UserEntity student = UserEntity.builder().id(10L).fullName("Học viên").build();
        UserEntity instructor = UserEntity.builder().id(20L).fullName("Giáo viên").build();
        CategoryEntity category = CategoryEntity.builder().id(40L).name("Toán").build();
        CourseEntity course = CourseEntity.builder().id(50L).name("Toán 10").categoryEntity(category).build();
        CoursePackageEntity coursePackage = CoursePackageEntity.builder()
                .id(60L).name("Gói 1-1").includedTutorSessions(20).courseEntity(course).build();
        EnrollmentPackageEntity enrollmentPackage = EnrollmentPackageEntity.builder()
                .id(70L).coursePackageEntity(coursePackage).build();
        OneOnOneRequestEntity request = OneOnOneRequestEntity.builder()
                .id(80L).studentEntity(student).enrollmentPackageEntity(enrollmentPackage)
                .assignedInstructorEntity(instructor).status(OneOnOneRequestStatusEnum.INSTRUCTOR_ACCEPTED).build();
        LocalDateTime startAt = LocalDateTime.now().plusDays(1);
        OneOnOneTrialClassRequest payload = OneOnOneTrialClassRequest.builder()
                .className("Lớp thử Toán 10").startAt(startAt).endAt(startAt.plusMinutes(45))
                .learningMode("GOOGLE_MEET").linkOrLocation("https://meet.example/trial").build();

        when(requestRepository.findByIdForUpdate(80L)).thenReturn(java.util.Optional.of(request));
        when(requestRepository.save(any(OneOnOneRequestEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(classRepository.save(any(ClassEntity.class))).thenAnswer(invocation -> {
            ClassEntity saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(90L);
            return saved;
        });
        when(classOnlineRepository.save(any(ClassOnlineEntity.class))).thenAnswer(invocation -> {
            ClassOnlineEntity saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(100L);
            return saved;
        });
        when(classOnlineRepository.findByTeacherEntity_Id(20L)).thenReturn(List.of());
        when(classMemberRepository.findById_UserId(10L)).thenReturn(List.of());
        when(userRoleRepository.findByUserEntity_IdWithRole(20L)).thenReturn(List.of());

        var response = service.markContacted(80L, payload);

        assertThat(response.getStatus()).isEqualTo(OneOnOneRequestStatusEnum.TRIAL_SCHEDULED);
        assertThat(response.getTrialClassId()).isEqualTo(90L);
        assertThat(response.getTrialSessionId()).isEqualTo(100L);
        assertThat(request.getTrialClassEntity().getClassKind()).isEqualTo(ClassKindEnum.ONE_ON_ONE_TRIAL);
        verify(classMemberRepository, times(2)).save(any(ClassMemberEntity.class));
        verify(classOnlineRepository).save(any(ClassOnlineEntity.class));
    }

    /** Từ chối kết nối phải chặn assignee cũ, mở REMATCHING và thông báo ứng viên khác. */
    @Test
    void rejectConnectionReopensMatchingAndNotifiesOtherCandidates() {
        UserEntity student = UserEntity.builder().id(10L).fullName("Học viên").build();
        UserEntity rejected = UserEntity.builder().id(20L).fullName("Giáo viên cũ").build();
        UserEntity candidateUser = UserEntity.builder().id(30L).fullName("Giáo viên mới").build();
        CategoryEntity category = CategoryEntity.builder().id(40L).name("Toán").build();
        CourseEntity course = CourseEntity.builder().id(50L).name("Toán 10").categoryEntity(category).build();
        CoursePackageEntity coursePackage = CoursePackageEntity.builder().id(60L).courseEntity(course).build();
        EnrollmentPackageEntity enrollmentPackage = EnrollmentPackageEntity.builder()
                .id(70L).coursePackageEntity(coursePackage).build();
        OneOnOneRequestEntity request = OneOnOneRequestEntity.builder()
                .id(80L)
                .studentEntity(student)
                .enrollmentPackageEntity(enrollmentPackage)
                .assignedInstructorEntity(rejected)
                .acceptedAt(LocalDateTime.now())
                .status(OneOnOneRequestStatusEnum.INSTRUCTOR_ACCEPTED)
                .build();
        EmployeeEntity candidate = EmployeeEntity.builder()
                .userId(candidateUser.getId())
                .userEntity(candidateUser)
                .employeeCode("GV030")
                .status(EmployeeStatusEnum.ACTIVE)
                .build();
        TeacherCategoryEntity assignment = TeacherCategoryEntity.builder()
                .employee(candidate)
                .category(category)
                .status(BaseStatusEnum.ACTIVE)
                .build();

        when(requestRepository.findByIdForUpdate(80L)).thenReturn(java.util.Optional.of(request));
        when(requestRepository.save(any(OneOnOneRequestEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(teacherCategoryRepository.findByCategory_IdAndStatus(40L, BaseStatusEnum.ACTIVE))
                .thenReturn(List.of(assignment));
        when(userRoleRepository.hasActiveInstructorRole(eq(30L), any(LocalDateTime.class))).thenReturn(true);
        when(userRoleRepository.findByUserEntity_IdWithRole(30L)).thenReturn(List.of());
        when(userRepository.findAllById(any())).thenReturn(List.of(candidateUser));
        when(rejectedInstructorRepository.existsByRequestEntity_IdAndInstructorEntity_Id(anyLong(), anyLong()))
                .thenReturn(false);

        var response = service.rejectConnection(80L, "Không phù hợp phương án kết nối");

        assertThat(response.getStatus()).isEqualTo(OneOnOneRequestStatusEnum.REMATCHING);
        assertThat(request.getAssignedInstructorEntity()).isNull();
        assertThat(request.getAcceptedAt()).isNull();
        verify(rejectedInstructorRepository).save(any(OneOnOneRejectedInstructorEntity.class));
        verify(notificationService, times(3)).createSystemNotification(any(), any(), any(), any(), anyLong(), any());
        verify(eventPublisher).publishEvent(any());
    }
}
