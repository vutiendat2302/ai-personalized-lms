package com.ailms.response;

import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassScheduleResponse {

    private Long id;

    private Long classId;

    private Integer dayOfWeek;

    private LocalTime startTime;

    private LocalTime endTime;

    private String status;
}
