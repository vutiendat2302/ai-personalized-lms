package com.ailms.service.imp;

import com.ailms.entity.*;
import com.ailms.entity.enums.ClassMemberRole;
import com.ailms.entity.enums.ClassMemberStatusEnum;
import com.ailms.repository.*;
import com.ailms.service.*;
import com.ailms.service.calculator.LearningStreakCalculator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/** Kiểm tra lịch học viên được dựng từ membership và session thật của lớp. */
@ExtendWith(MockitoExtension.class)
class StudentPortalServiceTest {
    @Mock private LearningActivityLogRepository learningActivityLogRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private CourseProgressRepository courseProgressRepository;
    @Mock private StudyGoalRepository studyGoalRepository;
    @Mock private LearningStreakCalculator learningStreakCalculator;
    @Mock private CourseRepository courseRepository;
    @Mock private CoursePackageRepository coursePackageRepository;
    @Mock private StudentInterestRepository studentInterestRepository;
    @Mock private ApplicationEventPublisher applicationEventPublisher;
    @Mock private SubmissionRepository submissionRepository;
    @Mock private CertificateRepository certificateRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private CourseTeacherRepository courseTeacherRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private ApprovalRequestRepository approvalRequestRepository;
    @Mock private ClassOnlineRepository classOnlineRepository;
    @Mock private LearningSessionRepository learningSessionRepository;
    @Mock private IStudentLearningService studentLearningService;
    @Mock private ICouponService couponService;
    @Mock private IStudyGoalService studyGoalService;
    @Mock private IStudentProfileService studentProfileService;
    @Mock private IOrderService orderService;
    @Mock private IApprovalRequestService approvalRequestService;
    @Mock private ICartService cartService;
    @Mock private LessonRepository lessonRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private ClassMemberRepository classMemberRepository;
    @Mock private ClassRepository classRepository;
    @Mock private EnrollmentPackageRepository enrollmentPackageRepository;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks private StudentPortalService service;

    /** Membership ACTIVE sau nhận lớp phải làm session của lớp xuất hiện trên lịch học viên. */
    @Test
    void activeClassMembershipExposesOnlineSessionInStudentSchedule() {
        CourseEntity course = CourseEntity.builder().id(20L).name("Java").build();
        ClassEntity clazz = ClassEntity.builder().id(10L).name("Java Group 01").courseEntity(course).build();
        ClassMemberEntity member = ClassMemberEntity.builder().classEntity(clazz)
                .roleInClass(ClassMemberRole.STUDENT).status(ClassMemberStatusEnum.ACTIVE).build();
        LocalDateTime start = LocalDateTime.now().plusDays(2);
        ClassOnlineEntity session = ClassOnlineEntity.builder().id(30L).classEntity(clazz)
                .title("Buổi 1").scheduledAt(start).durationMin(60).meetingUrl("https://meet.example/1").build();
        when(enrollmentPackageRepository.findActiveCourseIdsByUser(eq(1L), any(LocalDateTime.class)))
                .thenReturn(List.of(20L));
        when(classMemberRepository.findById_UserId(1L)).thenReturn(List.of(member));
        when(classOnlineRepository.findStudentSchedule(eq(List.of(10L)), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(session));

        var result = service.getSchedule(1L);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getType()).isEqualTo("ONLINE_CLASS");
        assertThat(result.getFirst().getClassName()).isEqualTo("Java Group 01");
        assertThat(result.getFirst().getStartAt()).isEqualTo(start);
    }
}
