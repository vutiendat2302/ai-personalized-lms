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
public class SalesDailyRevenueResponse {
    private String date;
    private BigDecimal revenue;
    private Integer ordersCount;
}
