package com.ailms.response;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/** Số liệu tổng quan và xu hướng phục vụ bảng điều khiển chấm công. */
public class AttendanceSummaryResponse {
    private Long totalEmployeesToday;
    private Long presentCount;
    private Long lateCount;
    private Long absentCount;
    private Long onLeaveCount;
    private Double totalOvertimeHoursThisWeek;
    private Map<String, Long> lateCountByDepartment;
    private List<DailyTrendPoint> weeklyTrend;
}
