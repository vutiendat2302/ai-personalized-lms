package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import lombok.Builder;
import lombok.Getter;

/** Thống kê quota buổi học của lớp dựa trên gói đã liên kết. */
@Getter
@Builder
public class ClassSessionUsageResponse {
    private Long classId;
    private Integer totalSessions;
    private long reviewedSessions;
    private long scheduledSessions;
    private Integer remainingSessions;
    private boolean packageLimitConfigured;
    private BaseStatusEnum classStatus;
}
