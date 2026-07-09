package com.ailms.request;

import com.ailms.entity.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Work date is required")
    private LocalDateTime workDate;

    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    private AttendanceStatus status;

    private String note;
}
