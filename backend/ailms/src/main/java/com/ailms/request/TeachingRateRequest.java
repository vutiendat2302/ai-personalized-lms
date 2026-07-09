package com.ailms.request;

import com.ailms.entity.PaymentType;
import com.ailms.entity.RateStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TeachingRateRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Class ID is required")
    private Long classId;

    private PaymentType paymentType;

    private BigDecimal rate;

    private LocalDateTime effectiveFrom;

    private LocalDateTime effectiveTo;

    private RateStatus status;
}
