package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherAvailabilityResponse {

    private Long id;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private Integer dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private BaseStatusEnum status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
