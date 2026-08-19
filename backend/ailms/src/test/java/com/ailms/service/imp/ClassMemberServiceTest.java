package com.ailms.service.imp;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.ClassMemberEntity;
import com.ailms.entity.ClassScheduleEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.entity.enums.NotificationTypeEnum;
import com.ailms.repository.ClassMemberRepository;
import com.ailms.repository.ClassRepository;
import com.ailms.repository.ClassScheduleRepository;
import com.ailms.repository.DegreeRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.repository.UserRepository;
import com.ailms.service.INotificationService;
import com.ailms.service.ITeacherActivityService;
import com.ailms.service.lock.CapacityLockStrategy;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class ClassMemberServiceTest {

    @Mock private ClassRepository classRepository;
    @Mock private UserRepository userRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private StudentProfileRepository studentProfileRepository;
    @Mock private DegreeRepository degreeRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private ITeacherActivityService teacherActivityService;
    @Mock private INotificationService notificationService;
    @Mock private CapacityLockStrategy capacityLockStrategy;
    @Mock private ClassScheduleRepository classScheduleRepository;
    @InjectMocks private ClassMemberService service;

    /** Gán giáo viên tạo membership ACTIVE và thông báo hệ thống ngay tại backend. */
    @Test
    void joinTeacherCreatesAssignmentAndNotification() {
        ClassEntity clazz = ClassEntity.builder().id(11L).name("Java Group 01").build();
        UserEntity teacher = UserEntity.builder().id(22L).fullName("Teacher A").build();
        when(classRepository.findById(11L)).thenReturn(Optional.of(clazz));
        when(userRepository.findById(22L)).thenReturn(Optional.of(teacher));
        when(classMemberRepository.findById_ClassIdAndId_UserId(11L, 22L)).thenReturn(Optional.empty());
        when(classMemberRepository.save(any(ClassMemberEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ClassMemberEntity result = service.join(11L, 22L, ClassMemberRole.TEACHER);

        assertEquals(ClassMemberRole.TEACHER, result.getRoleInClass());
        verify(notificationService).createSystemNotification(eq(teacher), eq(NotificationTypeEnum.GENERAL),
                eq("Phân công lớp mới"), eq("Bạn vừa được phân công phụ trách lớp Java Group 01."),
                eq(11L), eq("/teacher/classes/11"));
        verify(capacityLockStrategy).releaseLock(11L);
    }

    /** Đổi giáo viên phải bị chặn trước khi gỡ người cũ nếu lịch người mới giao với lớp đích. */
    @Test
    void replaceTeacherRejectsScheduleConflictBeforeMembershipChanges() {
        ClassEntity target = ClassEntity.builder().id(11L).name("Java Group 01")
                .startDate(LocalDateTime.now()).endDate(LocalDateTime.now().plusMonths(2)).build();
        ClassEntity existing = ClassEntity.builder().id(12L).name("Spring Group 01")
                .startDate(LocalDateTime.now()).endDate(LocalDateTime.now().plusMonths(2)).build();
        UserEntity newTeacher = UserEntity.builder().id(22L).build();
        ClassMemberEntity existingAssignment = ClassMemberEntity.builder().classEntity(existing)
                .userEntity(newTeacher).roleInClass(ClassMemberRole.TEACHER)
                .status(ClassMemberStatusEnum.ACTIVE).build();
        ClassScheduleEntity targetSlot = ClassScheduleEntity.builder().classEntity(target).dayOfWeek(1)
                .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(21, 0))
                .status(com.ailms.entity.enums.BaseStatusEnum.ACTIVE).build();
        ClassScheduleEntity existingSlot = ClassScheduleEntity.builder().classEntity(existing).dayOfWeek(1)
                .startTime(LocalTime.of(20, 0)).endTime(LocalTime.of(22, 0))
                .status(com.ailms.entity.enums.BaseStatusEnum.ACTIVE).build();
        when(classRepository.findById(11L)).thenReturn(Optional.of(target));
        when(userRepository.findById(22L)).thenReturn(Optional.of(newTeacher));
        when(classMemberRepository.findById_UserId(22L)).thenReturn(List.of(existingAssignment));
        when(classScheduleRepository.findByClassEntity_Id(11L)).thenReturn(List.of(targetSlot));
        when(classScheduleRepository.findByClassEntity_IdIn(List.of(12L))).thenReturn(List.of(existingSlot));

        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> service.replaceTeacher(11L, 22L, "Điều phối lại"))
                .isInstanceOf(com.ailms.exception.BusinessException.class)
                .hasMessageContaining("Spring Group 01");
        verify(classMemberRepository, never()).save(any());
    }
}
