package com.ailms.service.imp;

import com.ailms.entity.EnrollmentPackageEntity;
import com.ailms.repository.EnrollmentPackageRepository;
import com.ailms.service.IEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class EnrollmentExpirationAlertScheduler {

    private final EnrollmentPackageRepository enrollmentPackageRepository;
    private final IEmailService emailService;

    /**
     * Runs daily at 8:00 AM to send renewal alerts for packages expiring in 7 days.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional(readOnly = true)
    public void sendExpirationAlerts() {
        LocalDateTime startWindow = LocalDateTime.now().plusDays(6);
        LocalDateTime endWindow = LocalDateTime.now().plusDays(7);

        log.info("Checking for enrollment packages expiring between {} and {}", startWindow, endWindow);

        List<EnrollmentPackageEntity> expiringPackages = enrollmentPackageRepository.findAll().stream()
                .filter(ep -> ep.getExpiresAt() != null && !ep.getExpiresAt().isBefore(startWindow) && !ep.getExpiresAt().isAfter(endWindow))
                .toList();

        for (EnrollmentPackageEntity ep : expiringPackages) {
            if (ep.getEnrollmentEntity() != null && ep.getEnrollmentEntity().getUserEntity() != null) {
                String email = ep.getEnrollmentEntity().getUserEntity().getEmail();
                String pkgName = ep.getCoursePackageEntity() != null ? ep.getCoursePackageEntity().getName() : "Package";

                if (email != null) {
                    try {
                        emailService.sendInviteEmail(email, "Your access to " + pkgName + " expires in 7 days. Renew now to avoid interruption!");
                    } catch (Exception e) {
                        log.error("Failed to send renewal alert email to {}", email, e);
                    }
                }
            }
        }
    }
}
