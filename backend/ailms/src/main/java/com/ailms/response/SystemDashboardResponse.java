package com.ailms.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemDashboardResponse {

    private Long totalEnrollments;

    private Double avgCompletionRate;

    private BigDecimal avgQuizScore;

    private Double dropoutRate;

    private Long totalCertificatesIssued;
}
