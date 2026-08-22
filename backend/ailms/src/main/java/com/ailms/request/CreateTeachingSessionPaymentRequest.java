package com.ailms.request;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTeachingSessionPaymentRequest {

    private Long classOnlineId;

    private Long employeeId;

    private Long rateId;

    private BigDecimal rateApplied;

    private int actualDurationMin;

    private BigDecimal amount;

    private String description;
}
