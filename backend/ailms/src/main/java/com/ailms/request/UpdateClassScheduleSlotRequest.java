package com.ailms.request;

import lombok.*;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateClassScheduleSlotRequest {
    private Integer dayOfWeek; // 1-7 (1=Monday .. 7=Sunday)
    private LocalTime startTime;
    private LocalTime endTime;
}
