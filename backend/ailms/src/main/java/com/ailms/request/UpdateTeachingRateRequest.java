package com.ailms.request;


import com.ailms.entity.enums.BaseStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UpdateTeachingRateRequest {

    private Long employeeId;

    private Long classId;

    private BigDecimal rate;

    private LocalDateTime effectiveFrom;

    private LocalDateTime effectiveTo;

    private BaseStatusEnum status;

    private String description;
}
