package com.ailms.request;

import com.ailms.entity.enums.AttendanceStatusEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAttendanceRequest {

    @NotNull(message = "Employee ID is required")
    private Long employeeId;

    @NotNull(message = "Check in time is required")
    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    private String note;
}
