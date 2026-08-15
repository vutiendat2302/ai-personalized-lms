package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.*;
import com.ailms.repository.*;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.INotificationService;
import com.ailms.service.IOrderService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Kiểm tra side effect khi HR/Admin quyết định yêu cầu vận hành lớp. */
@ExtendWith(MockitoExtension.class)
class ApprovalRequestServiceTest {

    @Mock private ApprovalRequestRepository approvalRequestRepository;
    @Mock private EmployeeContractRepository employeeContractRepository;
    @Mock private SalaryRepository salaryRepository;
    @Mock private TeachingSessionPaymentRepository teachingSessionPaymentRepository;
    @Mock private LeaveRequestRepository leaveRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private INotificationService notificationService;
    @Mock private IOrderService orderService;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private Authentication authentication;
    @Mock private CustomUserDetails userDetails;

    @InjectMocks private ApprovalRequestService service;

    /** Dọn SecurityContext sau mỗi test để không rò principal sang test khác. */
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** Duyệt nghỉ lớp mới gỡ membership và thông báo cho người dạy cùng học viên. */
    @Test
    void approvingClassWithdrawalRemovesTeacherAndNotifiesClass() {
        authenticate(99L);
        UserEntity teacher = UserEntity.builder().id(1L).fullName("Giáo viên").build();
        UserEntity student = UserEntity.builder().id(2L).fullName("Học viên").build();
        ClassEntity clazz = ClassEntity.builder().id(10L).name("Java 01").build();
        ClassMemberEntity teacherMember = ClassMemberEntity.builder().classEntity(clazz).userEntity(teacher)
                .roleInClass(ClassMemberRole.TEACHER).status(ClassMemberStatusEnum.ACTIVE).build();
        ClassMemberEntity studentMember = ClassMemberEntity.builder().classEntity(clazz).userEntity(student)
                .roleInClass(ClassMemberRole.STUDENT).status(ClassMemberStatusEnum.ACTIVE).build();
        ApprovalRequestEntity request = pendingWithdrawal(99L);
        when(approvalRequestRepository.findById(50L)).thenReturn(Optional.of(request));
        when(classMemberRepository.findById_ClassIdAndId_UserId(10L, 1L)).thenReturn(Optional.of(teacherMember));
        when(classMemberRepository.findById_ClassIdAndRoleInClassAndStatus(
                10L, ClassMemberRole.STUDENT, ClassMemberStatusEnum.ACTIVE)).thenReturn(List.of(studentMember));

        service.approve(50L, "Đồng ý phân công lại");

        assertThat(request.getStatus()).isEqualTo(ApprovalStatusEnum.CONFIRMED);
        assertThat(teacherMember.getStatus()).isEqualTo(ClassMemberStatusEnum.REMOVED);
        assertThat(teacherMember.getLeftAt()).isNotNull();
        verify(classMemberRepository).save(teacherMember);
        verify(notificationService, times(2)).createSystemNotification(any(), any(), any(), any(), any(), any());
    }

    /** Từ chối yêu cầu phải giữ nguyên phân công hiện tại. */
    @Test
    void rejectingClassWithdrawalKeepsTeacherMembership() {
        authenticate(99L);
        ApprovalRequestEntity request = pendingWithdrawal(99L);
        when(approvalRequestRepository.findById(50L)).thenReturn(Optional.of(request));
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        service.reject(50L, "Chưa có người thay thế");

        assertThat(request.getStatus()).isEqualTo(ApprovalStatusEnum.REJECTED);
        verify(classMemberRepository, never()).save(any());
    }

    /** Gắn principal quản trị vào SecurityContext cho luồng quyết định. */
    private void authenticate(Long userId) {
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getUser()).thenReturn(UserEntity.builder().id(userId).build());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    /** Tạo yêu cầu nghỉ lớp PENDING do giáo viên gửi. */
    private ApprovalRequestEntity pendingWithdrawal(Long approverId) {
        return ApprovalRequestEntity.builder().id(50L).targetType("CLASS_TEACHER_LEAVE_REQUEST")
                .targetId(10L).createdBy(1L).approverId(approverId)
                .status(ApprovalStatusEnum.PENDING).build();
    }
}
