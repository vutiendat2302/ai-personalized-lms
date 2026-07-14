package com.ailms.request;

import com.ailms.entity.SessionPaymentStatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeachingSessionPaymentRequest {

    @NotNull(message = "Class online ID is required")
    private Long classOnlineId;

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    private Long rateId;

    private BigDecimal rateApplied;

    private Integer actualDurationMin;

    private BigDecimal amount;

    private SessionPaymentStatusEnum status;
}
