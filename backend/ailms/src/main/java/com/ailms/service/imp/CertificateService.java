package com.ailms.service.imp;

import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.CertificateEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.QuizEntity;
import com.ailms.entity.QuizAttemptEntity;
import com.ailms.entity.enums.CertificateConditionTypeEnum;
import com.ailms.entity.enums.CertificateStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CertificateMapper;
import com.ailms.repository.CertificateRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.repository.LessonRepository;
import com.ailms.repository.QuizRepository;
import com.ailms.repository.QuizAttemptRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.UserRepository;
import com.ailms.response.CertificateResponse;
import com.ailms.service.ICertificateService;
import com.ailms.service.IEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Entities;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CertificateService implements ICertificateService {

    private final CertificateRepository certificateRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final CertificateMapper certificateMapper;
    private final IEmailService emailService;
    private final ApplicationEventPublisher applicationEventPublisher;

    private static final String RESOURCE_NAME = "Certificate";

    @Transactional
    @Override
    public CertificateResponse evaluateAndGenerateCertificate(Long enrollmentId) {
        log.info("Evaluating certificate condition for enrollment: {}", enrollmentId);
        EnrollmentEntity enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> ResourceNotFoundException.of("Enrollment", enrollmentId));
        return generate(enrollment, true);
    }

    /** Cấp chứng chỉ cho đúng enrollment thuộc học viên JWT. */
    @Transactional
    @Override
    public CertificateResponse evaluateAndGenerateForUser(Long enrollmentId, Long userId) {
        EnrollmentEntity enrollment = enrollmentRepository.findById(enrollmentId)
                .filter(item -> item.getUserEntity() != null && userId.equals(item.getUserEntity().getId()))
                .orElseThrow(() -> ResourceNotFoundException.of("Enrollment", enrollmentId));
        return generate(enrollment, true);
    }

    /** Cấp chứng chỉ idempotent khi đủ điều kiện và trả null khi chưa đạt. */
    @Transactional
    @Override
    public CertificateResponse issueIfEligible(Long enrollmentId) {
        EnrollmentEntity enrollment = enrollmentRepository.findById(enrollmentId).orElse(null);
        return enrollment == null ? null : generate(enrollment, false);
    }

    /** Kiểm tra điều kiện và tạo duy nhất một chứng chỉ cho enrollment. */
    private CertificateResponse generate(EnrollmentEntity enrollment, boolean failWhenIneligible) {
        Long enrollmentId = enrollment.getId();

        if (certificateRepository.existsByEnrollmentId(enrollmentId)) {
            CertificateEntity existing = certificateRepository.findByEnrollmentId(enrollmentId).get();
            return enrichResponse(existing);
        }

        CourseEntity course = enrollment.getCourseEntity();
        if (course == null) {
            throw new BusinessException("Enrollment is not associated with a course.");
        }

        int passThreshold = course.getCertificatePassThreshold() != null ? course.getCertificatePassThreshold() : 80;
        boolean passed = isEligible(enrollment, course, passThreshold);

        if (!passed) {
            if (!failWhenIneligible) return null;
            if (course.getCertificateConditionType() == CertificateConditionTypeEnum.FINAL_EXAM_PASS) {
                throw new BusinessException("Bạn cần hoàn thành và đạt bài kiểm tra cuối khóa trước khi nhận chứng chỉ.");
            }
            throw new BusinessException("Student has not met certificate conditions (Threshold: " + passThreshold + "%).");
        }

        String certificateCode = CodeGenerator.generate("CERT", code -> certificateRepository.findByCertificateCode(code).isPresent());

        CertificateEntity cert = CertificateEntity.builder()
                .enrollmentId(enrollmentId)
                .courseId(course.getId())
                .userId(enrollment.getUserEntity().getId())
                .certificateCode(certificateCode)
                .status(CertificateStatusEnum.ISSUED)
                .issuedAt(LocalDateTime.now())
                .build();

        CertificateEntity saved = certificateRepository.save(cert);
        saved.setDownloadUrl("/api/v1/student/certificates/" + saved.getId() + "/download");
        saved = certificateRepository.save(saved);

        // Notify student async
        if (enrollment.getUserEntity() != null && enrollment.getUserEntity().getEmail() != null) {
            try {
                emailService.sendInviteEmail(enrollment.getUserEntity().getEmail(),
                        "Congratulations! Your certificate for " + course.getName() + " is ready: " + saved.getDownloadUrl());
            } catch (Exception e) {
                log.error("Failed to send certificate notification email", e);
            }
        }

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "GENERATE_CERTIFICATE", "CERTIFICATE", saved.getId(), null, saved));
        return enrichResponse(saved);
    }

    /** Đánh giá theo đúng số bài của khóa hoặc kết quả các quiz cuối khóa đang ACTIVE. */
    private boolean isEligible(EnrollmentEntity enrollment, CourseEntity course, int passThreshold) {
        if (course.getCertificateConditionType() == CertificateConditionTypeEnum.FINAL_EXAM_PASS) {
            List<QuizEntity> activeCourseQuizzes = quizRepository.findByCourseId(course.getId()).stream()
                    .filter(quiz -> quiz.getClassId() == null)
                    .filter(quiz -> quiz.getStatus() == com.ailms.entity.enums.BaseStatusEnum.ACTIVE)
                    .toList();
            List<QuizEntity> standaloneFinalQuizzes = activeCourseQuizzes.stream()
                    .filter(quiz -> quiz.getLessonId() == null && quiz.getSectionId() == null)
                    .toList();
            // Seeded and authored courses may attach the final quiz to its assessment lesson.
            List<QuizEntity> finalQuizzes = standaloneFinalQuizzes.isEmpty() ? activeCourseQuizzes : standaloneFinalQuizzes;
            if (finalQuizzes.isEmpty()) return false;
            Set<Long> passedQuizIds = quizAttemptRepository.findByEnrollmentId(enrollment.getId()).stream()
                    .filter(attempt -> Boolean.TRUE.equals(attempt.getIsPassed()))
                    .map(QuizAttemptEntity::getQuizId).collect(Collectors.toSet());
            return finalQuizzes.stream().allMatch(quiz -> passedQuizIds.contains(quiz.getId()));
        }
        int totalLessons = lessonRepository.countByCourseSectionEntityCourseEntityId(course.getId());
        if (totalLessons <= 0) return false;
        long completed = lessonProgressRepository.countByEnrollmentIdAndStatusEquals(enrollment.getId(), (byte) 1);
        int completionRate = (int) Math.min(100, Math.round((double) completed * 100 / totalLessons));
        return completionRate >= passThreshold;
    }

    @Override
    public CertificateResponse verifyCertificate(String certificateCode) {
        log.info("Public verification for certificate code: {}", certificateCode);

        CertificateEntity cert = certificateRepository.findByCertificateCode(certificateCode)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found for code: " + certificateCode));

        return enrichResponse(cert);
    }

    @Override
    public CertificateResponse getByEnrollmentId(Long enrollmentId) {
        CertificateEntity cert = certificateRepository.findByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate not found for enrollment: " + enrollmentId));
        return enrichResponse(cert);
    }

    /** Render chứng chỉ PDF cho đúng học viên sở hữu. */
    @Override
    public byte[] downloadForOwner(Long certificateId, Long userId) {
        CertificateEntity certificate = certificateRepository.findById(certificateId)
                .filter(item -> userId.equals(item.getUserId()))
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, certificateId));
        if (certificate.getStatus() != CertificateStatusEnum.ISSUED) {
            throw new BusinessException("Chứng chỉ đã bị thu hồi và không thể tải xuống.");
        }
        return renderPdf(enrichResponse(certificate));
    }

    @Transactional
    @Override
    public CertificateResponse revokeCertificate(Long certificateId, String reason) {
        log.info("Revoking certificate: {}, reason: {}", certificateId, reason);

        CertificateEntity cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, certificateId));

        cert.setStatus(CertificateStatusEnum.REVOKED);
        cert.setRevokedAt(LocalDateTime.now());
        cert.setRevokedReason(reason);

        CertificateEntity saved = certificateRepository.save(cert);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "REVOKE_CERTIFICATE", "CERTIFICATE", certificateId, null, saved));
        return enrichResponse(saved);
    }

    private CertificateResponse enrichResponse(CertificateEntity entity) {
        CertificateResponse res = certificateMapper.toResponse(entity);
        res.setValid(entity.getStatus() == CertificateStatusEnum.ISSUED);
        if (entity.getCourseId() != null) {
            courseRepository.findById(entity.getCourseId()).ifPresent(course -> res.setCourseName(course.getName()));
        }
        if (entity.getUserId() != null) {
            userRepository.findById(entity.getUserId()).ifPresent(user -> res.setStudentName(user.getFullName()));
        }
        return res;
    }

    /** Render mẫu chứng chỉ Unicode thành PDF có mã xác minh công khai. */
    private byte[] renderPdf(CertificateResponse certificate) {
        try {
            String issuedDate = certificate.getIssuedAt() != null
                    ? certificate.getIssuedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "";
            String html = """
                    <html><head><style>
                    @page { size: A4 landscape; margin: 18mm; }
                    body { font-family: 'Noto Sans'; color: #172554; text-align: center; }
                    .frame { border: 8px double #29378f; height: 145mm; padding: 18mm; box-sizing: border-box; }
                    h1 { font-size: 34px; letter-spacing: 2px; margin: 12px 0; }
                    h2 { font-size: 27px; color: #29378f; margin: 18px 0; }
                    .course { font-size: 21px; font-weight: 700; margin: 16px 0; }
                    .code { margin-top: 24px; font-size: 12px; color: #475569; }
                    </style></head><body><div class='frame'>
                    <div>AILMS • AI Personalized Learning Management System</div>
                    <h1>CHỨNG NHẬN HOÀN THÀNH</h1>
                    <p>Trân trọng chứng nhận học viên</p><h2>%s</h2>
                    <p>đã hoàn thành khóa học</p><div class='course'>%s</div>
                    <p>Ngày cấp: %s</p><div class='code'>Mã xác minh: %s</div>
                    </div></body></html>
                    """.formatted(Entities.escape(certificate.getStudentName()),
                    Entities.escape(certificate.getCourseName()), issuedDate,
                    Entities.escape(certificate.getCertificateCode()));
            Document document = Jsoup.parse(html);
            document.outputSettings().syntax(Document.OutputSettings.Syntax.xml);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            byte[] regular = readResource("/fonts/NotoSans-Regular.ttf");
            byte[] bold = readResource("/fonts/NotoSans-Bold.ttf");
            builder.useFont(() -> new ByteArrayInputStream(regular), "Noto Sans", 400,
                    PdfRendererBuilder.FontStyle.NORMAL, true);
            builder.useFont(() -> new ByteArrayInputStream(bold), "Noto Sans", 700,
                    PdfRendererBuilder.FontStyle.NORMAL, true);
            builder.withHtmlContent(document.html(), null);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (Exception exception) {
            throw new BusinessException("Không thể tạo PDF chứng chỉ: " + exception.getMessage());
        }
    }

    /** Đọc tài nguyên font đóng gói trong backend. */
    private byte[] readResource(String path) throws Exception {
        try (var input = getClass().getResourceAsStream(path)) {
            if (input == null) throw new IllegalStateException("Thiếu tài nguyên " + path);
            return input.readAllBytes();
        }
    }
}
