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
public class SalesTopPackageResponse {
    private String id;
    private String name;
    private Long salesCount;
    private BigDecimal revenue;
}
