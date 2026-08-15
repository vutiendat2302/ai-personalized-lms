package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesKpiResponse {
    private BigDecimal todayRevenue;
    private Double revenueChangePercent;
    private BigDecimal monthRevenue;
    private Double monthRevenueChangePercent;
    private BigDecimal allTimeRevenue;
    private Integer successfulOrdersCount;
    private Integer refundedOrdersCount;
    private BigDecimal refundedAmount;
    private Integer failedPaymentsCount;
    private BigDecimal averageOrderValue;
    private Integer pendingOrdersCount;
    private Boolean isPendingWarning;
    private Double conversionRate;
    private Integer expiringCouponsCount;
}
