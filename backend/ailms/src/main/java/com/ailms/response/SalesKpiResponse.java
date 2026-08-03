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
    private Integer pendingOrdersCount;
    private Boolean isPendingWarning;
    private Double conversionRate;
    private Integer expiringCouponsCount;
}
