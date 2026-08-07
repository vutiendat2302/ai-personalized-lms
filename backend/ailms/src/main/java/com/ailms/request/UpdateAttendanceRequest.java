package com.ailms.request;

import com.ailms.entity.enums.AttendanceStatusEnum;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAttendanceRequest {

    private LocalDate workDate;

    private Long workShiftId;

    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    private AttendanceStatusEnum status;

    private String note;
}
