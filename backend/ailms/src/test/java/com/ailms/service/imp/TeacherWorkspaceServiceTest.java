package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.exception.BusinessException;
import com.ailms.repository.*;
import com.ailms.request.TeacherWorkspaceRequest;
import com.ailms.service.IAssessmentService;
import com.ailms.service.ILeaveRequestService;
import com.ailms.service.INotificationService;
import com.ailms.service.ITeacherActivityService;
import com.ailms.service.IOneOnOneService;
import com.ailms.service.IClassSessionManagementService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** Kiểm tra các invariant phân quyền và điểm số quan trọng của Teacher workspace. */
@ExtendWith(MockitoExtension.class)
class TeacherWorkspaceServiceTest {

    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private ClassScheduleRepository classScheduleRepository;
    @Mock private ClassOnlineRepository classOnlineRepository;
    @Mock private CourseTeacherRepository courseTeacherRepository;
    @Mock private CourseProgressRepository courseProgressRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private SubmissionRepository submissionRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private QuizAnswerRepository quizAnswerRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private UserRepository userRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private TeacherCategoryRepository teacherCategoryRepository;
    @Mock private TeachingSessionPaymentRepository paymentRepository;
    @Mock private TeachingRateRepository teachingRateRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private ApprovalRequestRepository approvalRequestRepository;
    @Mock private ClassRepository classRepository;
    @Mock private IAssessmentService assessmentService;
    @Mock private ILeaveRequestService leaveRequestService;
    @Mock private IOneOnOneService oneOnOneService;
    @Mock private INotificationService notificationService;
    @Mock private ITeacherActivityService teacherActivityService;
    @Mock private IClassSessionManagementService classSessionManagementService;

    @InjectMocks private TeacherWorkspaceService service;

    /** Không cho nhận xét khi buổi học chưa kết thúc dù user quản lý đúng lớp. */
    @Test
    void rejectsReviewBeforeSessionEnds() {
        ClassEntity clazz = ClassEntity.builder().id(10L).build();
        ClassOnlineEntity session = ClassOnlineEntity.builder().id(20L).classEntity(clazz)
                .scheduledAt(LocalDateTime.now().plusHours(1)).durationMin(60).build();
        when(classOnlineRepository.findById(20L)).thenReturn(Optional.of(session));
        when(classMemberRepository.findById_ClassIdAndId_UserId(10L, 1L))
                .thenReturn(Optional.of(managedMember(clazz)));

        assertThatThrownBy(() -> service.reviewSession(1L, 20L,
                TeacherWorkspaceRequest.SessionReview.builder().note("Nhận xét").build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("kết thúc");
        verify(classOnlineRepository, never()).save(any());
    }

    /** Không cho chấm điểm vượt maxScore của assignment. */
    @Test
    void rejectsAssignmentScoreAboveMaximum() {
        ClassEntity clazz = ClassEntity.builder().id(10L).build();
        AssignmentEntity assignment = AssignmentEntity.builder().id(30L).classId(10L)
                .maxScore(BigDecimal.TEN).build();
        SubmissionEntity submission = SubmissionEntity.builder().id(40L).assignmentId(30L)
                .status((byte) 0).build();
        when(submissionRepository.findById(40L)).thenReturn(Optional.of(submission));
        when(assignmentRepository.findById(30L)).thenReturn(Optional.of(assignment));
        when(classMemberRepository.findById_UserId(1L)).thenReturn(List.of(managedMember(clazz)));
        when(courseTeacherRepository.findByUserEntity_IdAndStatus(anyLong(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> service.gradeSubmission(1L, 40L,
                TeacherWorkspaceRequest.SubmissionGrade.builder().score(BigDecimal.valueOf(11)).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("điểm tối đa");
        verify(assessmentService, never()).gradeSubmission(anyLong(), any(), anyLong());
    }

    /** Tạo membership Teacher ACTIVE dùng chung cho các test quyền lớp. */
    private ClassMemberEntity managedMember(ClassEntity clazz) {
        return ClassMemberEntity.builder().classEntity(clazz).roleInClass(ClassMemberRole.TEACHER)
                .status(ClassMemberStatusEnum.ACTIVE).build();
    }
}
