package com.ailms.response;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryTrendPoint {
    private String periodLabel; // e.g. "07/2026"
    private String period;      // e.g. "2026-07"
    private BigDecimal totalSalary;
}
