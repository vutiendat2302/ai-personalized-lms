package com.ailms.response;

import com.ailms.entity.enums.SessionPaymentStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeachingSessionPaymentResponse {

    private Long id;

    private Long classOnlineId;

    private Long employeeId;

    private Long rateId;

    private BigDecimal rateApplied;

    private Integer actualDurationMin;

    private BigDecimal amount;

    private SessionPaymentStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
