package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CreateTeachingRateRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    private Long classId;

    private BigDecimal rate;

    private LocalDateTime effectiveFrom;

    private LocalDateTime effectiveTo;

    private String description;
}
