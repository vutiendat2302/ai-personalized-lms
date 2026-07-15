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

    @NotBlank(message = "Check in is not null)")
    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    private AttendanceStatusEnum status;

    private String note;
}
