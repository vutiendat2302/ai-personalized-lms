package com.ailms.response;

import com.ailms.entity.enums.LeaveStatusEnum;
import com.ailms.entity.enums.LeaveTypeEnum;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequestResponse {

    private Long id;

    private Long employeeId;

    private String employeeName;

    private String employeeCode;

    private LeaveTypeEnum leaveType;

    private LocalDate startDate;

    private LocalDate endDate;

    private String reason;

    private LeaveStatusEnum status;

    private Long approverId;

    private String approverName;

    private LocalDateTime approvedAt;

    private String rejectionReason;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
