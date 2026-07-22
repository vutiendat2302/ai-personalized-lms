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
public class UpdateAttendanceRequest {

    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    private String note;
}
