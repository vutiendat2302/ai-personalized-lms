package com.ailms.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalarySummaryResponse {
    private String period; // e.g. "2026-07"
    private BigDecimal totalSalaryPaid;
    private Long totalSlips;
    private Long draftCount;
    private Long pendingCount;
    private Long confirmedCount;
    private Long paidCount;
    private Map<String, Long> statusDistribution;
    private Map<String, BigDecimal> salaryByDepartment;
    private List<SalaryTrendPoint> historicalTrend;
}
