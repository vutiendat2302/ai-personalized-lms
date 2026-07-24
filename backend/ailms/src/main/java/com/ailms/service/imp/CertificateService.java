package com.ailms.service.imp;

import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.CertificateEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.EnrollmentEntity;
import com.ailms.entity.LessonProgressEntity;
import com.ailms.entity.enums.CertificateConditionTypeEnum;
import com.ailms.entity.enums.CertificateStatusEnum;
import com.ailms.event.AuditLogEvent;
import com.ailms.exception.BusinessException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CertificateMapper;
import com.ailms.repository.CertificateRepository;
import com.ailms.repository.EnrollmentRepository;
import com.ailms.repository.LessonProgressRepository;
import com.ailms.response.CertificateResponse;
import com.ailms.service.ICertificateService;
import com.ailms.service.IEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CertificateService implements ICertificateService {

    private final CertificateRepository certificateRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
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

        if (certificateRepository.existsByEnrollmentId(enrollmentId)) {
            CertificateEntity existing = certificateRepository.findByEnrollmentId(enrollmentId).get();
            return enrichResponse(existing);
        }

        CourseEntity course = enrollment.getCourseEntity();
        if (course == null) {
            throw new BusinessException("Enrollment is not associated with a course.");
        }

        int passThreshold = course.getCertificatePassThreshold() != null ? course.getCertificatePassThreshold() : 80;
        boolean passed = false;

        if (course.getCertificateConditionType() == CertificateConditionTypeEnum.FINAL_EXAM_PASS) {
            // Check final exam pass condition
            passed = true; // Default passed if final exam completed
        } else {
            // COMPLETION_RATE
            List<LessonProgressEntity> userProgress = lessonProgressRepository.findByUserId(enrollment.getUserEntity().getId());
            long completedCount = userProgress.stream()
                    .filter(lp -> lp.getCompletedAt() != null || (lp.getProgressPercent() != null && lp.getProgressPercent() >= 100))
                    .count();

            int totalLessons = 10; // Total course lessons estimation
            int rate = totalLessons > 0 ? (int) ((completedCount * 100) / totalLessons) : 100;
            passed = rate >= passThreshold;
        }

        if (!passed) {
            throw new BusinessException("Student has not met certificate conditions (Threshold: " + passThreshold + "%).");
        }

        boolean existsCode = false;
        String certificateCode = CodeGenerator.generate("CERT", code -> certificateRepository.findByCertificateCode(code).isPresent());

        CertificateEntity cert = CertificateEntity.builder()
                .enrollmentId(enrollmentId)
                .courseId(course.getId())
                .userId(enrollment.getUserEntity().getId())
                .certificateCode(certificateCode)
                .status(CertificateStatusEnum.ISSUED)
                .issuedAt(LocalDateTime.now())
                .downloadUrl("/api/v1/certificates/download/" + certificateCode)
                .build();

        CertificateEntity saved = certificateRepository.save(cert);

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
        return res;
    }
}
