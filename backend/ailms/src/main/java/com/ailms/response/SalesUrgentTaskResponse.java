package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesUrgentTaskResponse {
    private String id;
    private String type; // EXPIRING_PENDING, FAILED_PAYMENT, PAID_NO_ENROLLMENT
    private String title;
    private String subtitle;
    private BigDecimal amount;
    private String orderId;
    private String studentName;
    private String studentPhone;
    private String studentEmail;
    private LocalDateTime expiredAt;
    private LocalDateTime createdAt;
}
