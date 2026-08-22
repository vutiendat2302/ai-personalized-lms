package com.ailms.request;

import com.ailms.entity.enums.AttendanceSourceEnum;
import com.ailms.entity.enums.AttendanceStatusEnum;
import org.springframework.format.annotation.DateTimeFormat;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class AttendanceSearchRequest extends CommonSearchRequest<AttendanceStatusEnum> {

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate workDateFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate workDateTo;

    private AttendanceSourceEnum source;

    private Long workShiftId;

    private Long departmentId;
}
