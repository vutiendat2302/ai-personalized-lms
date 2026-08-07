package com.ailms.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimulateAttendanceRequest {

    @NotNull(message = "fromDate không được để trống")
    private LocalDate fromDate;

    @NotNull(message = "toDate không được để trống")
    private LocalDate toDate;

    /** Danh sách ID nhân viên (Optional: null = áp dụng cho toàn bộ nhân viên ACTIVE). */
    private List<Long> employeeIds;

    /** Đè dữ liệu đã có hay không (Default = false, không đè dữ liệu DEVICE/MANUAL). */
    @Builder.Default
    private boolean overwriteExisting = false;
}
