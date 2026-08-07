package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO phản hồi chứa các chỉ số thống kê tổng hợp hợp đồng cho Dashboard Admin/HR.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractDashboardStatsResponse {

    private long totalContracts;
    private long activeContracts;
    private long expiringSoonContracts;
    private long probationExpiringContracts;
    private long signedThisMonthContracts;
    private long terminatedThisMonthContracts;
    private long missingFileContracts;

    private long unsignedContracts;
    private long pendingCompanySignCount;
    private long pendingEmployeeSignCount;
    private long fullySignedCount;

    /** Phân bổ loại hợp đồng (PROBATION, OFFICIAL, INDEFINITE, SEASONAL, FIXED_TERM). */
    private Map<String, Long> contractTypeDistribution;

    /** Phân bổ hình thức trả lương (HOURLY, DAILY, MONTHLY). */
    private Map<String, Long> salaryTypeDistribution;

    /** Phân bổ hợp đồng theo phòng ban. */
    private Map<String, Long> departmentDistribution;

    /** Timeline số lượng hợp đồng hết hạn trong 6 tháng tới (VD: "2026-08": 3). */
    private Map<String, Long> expiryTimeline6Months;
}
