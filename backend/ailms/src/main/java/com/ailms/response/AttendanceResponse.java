package com.ailms.response;

import com.ailms.entity.enums.AttendanceSourceEnum;
import com.ailms.entity.enums.AttendanceStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceResponse {

    private Long id;

    private Long employeeId;

    private String employeeName;

    private String employeeCode;

    private String departmentName;

    private String avatarUrl;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate workDate;

    private Long workShiftId;

    private String workShiftName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime checkInTime;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime checkOutTime;

    private AttendanceStatusEnum status;

    private Integer workedMinutes;

    private Integer lateMinutes;

    private Integer earlyLeaveMinutes;

    private Integer overtimeMinutes;

    private AttendanceSourceEnum source;

    private Long approvedBy;

    private String approvedByName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime approvedAt;

    private String note;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
