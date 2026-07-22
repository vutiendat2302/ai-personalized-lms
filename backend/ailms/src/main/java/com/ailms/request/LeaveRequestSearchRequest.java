package com.ailms.request;

import com.ailms.entity.enums.LeaveStatusEnum;
import com.ailms.entity.enums.LeaveTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class LeaveRequestSearchRequest extends CommonSearchRequest<LeaveStatusEnum> {

    private Long employeeId;

    private LeaveTypeEnum leaveType;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate fromDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate toDate;
}
