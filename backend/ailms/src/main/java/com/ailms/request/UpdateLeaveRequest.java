package com.ailms.request;

import com.ailms.entity.enums.LeaveStatusEnum;
import com.ailms.entity.enums.LeaveTypeEnum;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateLeaveRequest {

    private LeaveTypeEnum leaveType;

    private LocalDate startDate;

    private LocalDate endDate;

    private String reason;

    private LeaveStatusEnum status;

    private String rejectionReason;
}
