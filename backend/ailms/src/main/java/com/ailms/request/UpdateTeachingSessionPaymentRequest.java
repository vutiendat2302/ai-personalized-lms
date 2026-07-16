package com.ailms.request;

import com.ailms.entity.enums.SessionPaymentStatusEnum;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTeachingSessionPaymentRequest {

    private Long classOnlineId;

    private Long employeeId;

    private Long rateId;

    private BigDecimal rateApplied;

    private int actualDurationMin;

    private BigDecimal amount;

    private SessionPaymentStatusEnum status;

    private String description;
}
