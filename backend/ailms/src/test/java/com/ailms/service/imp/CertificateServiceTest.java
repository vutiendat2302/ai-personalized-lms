package com.ailms.service.imp;

import com.ailms.entity.CertificateEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.CertificateConditionTypeEnum;
import com.ailms.entity.enums.CertificateStatusEnum;
import com.ailms.mapper.CertificateMapper;
import com.ailms.repository.CertificateRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.QuizAttemptRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.repository.UserRepository;
import com.ailms.response.CertificateResponse;
import com.ailms.service.IEmailService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Kiểm tra cấp chứng chỉ theo tiến độ thật và tải PDF theo chủ sở hữu. */
@ExtendWith(MockitoExtension.class)
class CertificateServiceTest {
    @Mock private CertificateRepository certificateRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private LessonProgressRepository lessonProgressRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private UserRepository userRepository;
    @Mock private CertificateMapper certificateMapper;
    @Mock private IEmailService emailService;
    @Mock private ApplicationEventPublisher applicationEventPublisher;
    @InjectMocks private CertificateService service;

    /** Đủ toàn bộ hai bài phải cấp đúng một chứng chỉ và tạo URL tải thuộc student API. */
    @Test
    void issueIfEligibleUsesActualCourseLessonCount() {
        EnrollmentEntity enrollment = completedEnrollment();
        when(enrollmentRepository.findById(30L)).thenReturn(Optional.of(enrollment));
        when(certificateRepository.existsByEnrollmentId(30L)).thenReturn(false);
        when(lessonRepository.countByCourseSectionEntityCourseEntityId(20L)).thenReturn(2);
        when(lessonProgressRepository.countByEnrollmentIdAndStatusEquals(30L, (byte) 1)).thenReturn(2L);
        when(certificateRepository.findByCertificateCode(anyString())).thenReturn(Optional.empty());
        when(certificateRepository.save(any(CertificateEntity.class))).thenAnswer(invocation -> {
            CertificateEntity entity = invocation.getArgument(0);
            if (entity.getId() == null) entity.setId(40L);
            return entity;
        });
        when(certificateMapper.toResponse(any(CertificateEntity.class))).thenAnswer(invocation -> response(invocation.getArgument(0)));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(enrollment.getCourseEntity()));
        when(userRepository.findById(10L)).thenReturn(Optional.of(enrollment.getUserEntity()));

        CertificateResponse result = service.issueIfEligible(30L);

        assertEquals(40L, result.getId());
        assertTrue(result.getCertificateCode().startsWith("CERT"));
        assertEquals("/api/v1/student/certificates/40/download", result.getDownloadUrl());
    }

    /** Chưa đạt ngưỡng phải trả null và tuyệt đối không ghi chứng chỉ. */
    @Test
    void issueIfEligibleSkipsEnrollmentBelowThreshold() {
        EnrollmentEntity enrollment = completedEnrollment();
        when(enrollmentRepository.findById(30L)).thenReturn(Optional.of(enrollment));
        when(certificateRepository.existsByEnrollmentId(30L)).thenReturn(false);
        when(lessonRepository.countByCourseSectionEntityCourseEntityId(20L)).thenReturn(2);
        when(lessonProgressRepository.countByEnrollmentIdAndStatusEquals(30L, (byte) 1)).thenReturn(1L);

        assertNull(service.issueIfEligible(30L));
        verify(certificateRepository, never()).save(any());
    }

    /** Chứng chỉ hợp lệ của đúng chủ sở hữu phải render thành PDF thật. */
    @Test
    void downloadForOwnerRendersPdf() {
        CertificateEntity certificate = CertificateEntity.builder().id(40L).enrollmentId(30L)
                .courseId(20L).userId(10L).certificateCode("CERT-TEST")
                .status(CertificateStatusEnum.ISSUED).issuedAt(LocalDateTime.now()).build();
        when(certificateRepository.findById(40L)).thenReturn(Optional.of(certificate));
        when(certificateMapper.toResponse(certificate)).thenReturn(response(certificate));
        when(courseRepository.findById(20L)).thenReturn(Optional.of(CourseEntity.builder().id(20L).name("Java").build()));
        when(userRepository.findById(10L)).thenReturn(Optional.of(UserEntity.builder().id(10L).fullName("Học viên A").build()));

        byte[] pdf = service.downloadForOwner(40L, 10L);

        assertTrue(pdf.length > 1000);
        assertEquals("%PDF", new String(pdf, 0, 4, java.nio.charset.StandardCharsets.US_ASCII));
    }

    /** Tạo enrollment hoàn thành với điều kiện chứng chỉ 100% bài học. */
    private EnrollmentEntity completedEnrollment() {
        CourseEntity course = CourseEntity.builder().id(20L).name("Java")
                .certificateConditionType(CertificateConditionTypeEnum.COMPLETION_RATE)
                .certificatePassThreshold(100).build();
        UserEntity user = UserEntity.builder().id(10L).fullName("Học viên A").build();
        return EnrollmentEntity.builder().id(30L).courseEntity(course).userEntity(user)
                .status((byte) 1).completedAt(LocalDateTime.now()).build();
    }

    /** Chuyển entity tối thiểu sang response cho service enrich và render PDF. */
    private CertificateResponse response(CertificateEntity entity) {
        return CertificateResponse.builder().id(entity.getId()).enrollmentId(entity.getEnrollmentId())
                .courseId(entity.getCourseId()).userId(entity.getUserId())
                .certificateCode(entity.getCertificateCode()).status(entity.getStatus())
                .issuedAt(entity.getIssuedAt()).downloadUrl(entity.getDownloadUrl()).build();
    }
}
