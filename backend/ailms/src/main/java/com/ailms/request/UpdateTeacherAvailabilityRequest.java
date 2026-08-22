package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTeacherAvailabilityRequest {

    @Min(value = 1, message = "Day of week must be between 1 (Monday) and 7 (Sunday)")
    @Max(value = 7, message = "Day of week must be between 1 (Monday) and 7 (Sunday)")
    private Integer dayOfWeek;

    private LocalTime startTime;

    private LocalTime endTime;

    private BaseStatusEnum status;
}
