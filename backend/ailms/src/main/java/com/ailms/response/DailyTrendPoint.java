package com.ailms.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyTrendPoint {
    private LocalDate date;
    private String dayLabel; // e.g. "T2 25/07"
    private Long presentCount;
    private Long lateCount;
    private Long absentCount;
    private Long onLeaveCount;
}
