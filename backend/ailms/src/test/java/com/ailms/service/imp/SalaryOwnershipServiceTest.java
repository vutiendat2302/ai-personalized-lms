package com.ailms.service.imp;

import com.ailms.entity.SalaryEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.mapper.SalaryMapper;
import com.ailms.repository.AttendanceRepository;
import com.ailms.repository.EmployeeContractRepository;
import com.ailms.repository.EmployeeRepository;
import com.ailms.repository.SalaryRepository;
import com.ailms.repository.TeachingSessionPaymentRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.UserRoleRepository;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IApprovalRequestService;
import com.ailms.service.IEmailService;
import com.ailms.service.INotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SalaryOwnershipServiceTest {

    @Mock private SalaryRepository salaryRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private SalaryMapper salaryMapper;
    @Mock private EmployeeContractRepository employeeContractRepository;
    @Mock private IApprovalRequestService approvalRequestService;
    @Mock private INotificationService notificationService;
    @Mock private IEmailService emailService;
    @Mock private UserRepository userRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private TeachingSessionPaymentRepository teachingSessionPaymentRepository;
    @Mock private ApplicationEventPublisher applicationEventPublisher;
    @InjectMocks private SalaryService salaryService;

    /** Dọn SecurityContext sau mỗi test để không làm rò vai trò sang test khác. */
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    /** HR chỉ nhận các kỳ lương chứa phiếu do chính tài khoản HR đó tạo. */
    @Test
    void getPayrollBatchesScopesHrByCreatedBy() {
        authenticate(25L, "ROLE_HR");
        YearMonth period = YearMonth.of(2026, 8);
        when(salaryRepository.findByPeriodBetweenAndDeletedAtIsNull(period, period)).thenReturn(List.of(
                salary(period, 25L, new BigDecimal("1000000")),
                salary(period, 99L, new BigDecimal("2000000"))
        ));

        var result = salaryService.getPayrollBatches(period, period);

        assertEquals(1, result.size());
        assertEquals(1, result.getFirst().getSlipCount());
        assertEquals(new BigDecimal("1000000"), result.getFirst().getTotalAmount());
        assertEquals("25", result.getFirst().getCreatedBy());
    }

    /** Tạo phiếu lương tối thiểu phục vụ kiểm tra phạm vi người tạo. */
    private SalaryEntity salary(YearMonth period, Long createdBy, BigDecimal totalSalary) {
        return SalaryEntity.builder()
                .period(period)
                .createdBy(createdBy)
                .status(SalaryStatusEnum.DRAFT)
                .totalSalary(totalSalary)
                .build();
    }

    /** Gắn user và authority mô phỏng vào Spring SecurityContext. */
    private void authenticate(Long userId, String authority) {
        UserEntity user = UserEntity.builder().id(userId).build();
        CustomUserDetails principal = new CustomUserDetails(user, List.of(new SimpleGrantedAuthority(authority)));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
