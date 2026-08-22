package com.ailms.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/** Chi tiết một khoản cộng hoặc trừ trong bảng lương. */
public class SalaryDetailResponse {
    private Long id;
    private String itemKey;
    private BigDecimal amount;
    private String description;
}
