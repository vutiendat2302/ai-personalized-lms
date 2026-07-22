package com.ailms.service.imp;

import com.ailms.entity.EmployeeContractEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.UserRoleRepository;
import com.ailms.service.IEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class ContractExpirationScheduler {

    private final EmployeeContractRepository employeeContractRepository;
    private final UserRoleRepository userRoleRepository;
    private final IEmailService emailService;

    /**
     * Runs every day at 8:00 AM to check for contracts expiring in exactly 7 days.
     */
    @Scheduled(cron = "0 0 8 * * ?")
    public void checkExpiringContracts() {
        log.info("Starting scheduled scan for contracts expiring in 7 days...");
        LocalDate targetDate = LocalDate.now().plusDays(7);
        List<EmployeeContractEntity> expiringContracts = employeeContractRepository.findByStatusAndEndDate(BaseStatusEnum.ACTIVE, targetDate);

        if (expiringContracts.isEmpty()) {
            log.info("No contracts expiring on {}", targetDate);
            return;
        }

        log.info("Found {} contracts expiring on {}", expiringContracts.size(), targetDate);
        List<String> adminHrEmails = userRoleRepository.findAdminAndHrEmails();
        if (adminHrEmails.isEmpty()) {
            log.warn("No admin or HR emails found to notify!");
            return;
        }

        for (EmployeeContractEntity contract : expiringContracts) {
            String employeeName = contract.getEmployee().getUserEntity().getFullName();
            String contractCode = contract.getContractTypeEnum() != null ? contract.getContractTypeEnum().name() : "N/A";
            
            for (String email : adminHrEmails) {
                emailService.sendContractExpirationAlertEmail(email, employeeName, contractCode, targetDate);
            }
        }
        log.info("Scheduled contract scan completed.");
    }
}
