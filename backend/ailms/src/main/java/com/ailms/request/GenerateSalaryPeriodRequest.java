package com.ailms.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.YearMonth;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/** Tham số tạo bảng lương cho một kỳ, có tùy chọn ghi đè dữ liệu cũ. */
public class GenerateSalaryPeriodRequest {

    @NotNull(message = "Kỳ lương (period) không được để trống")
    @JsonFormat(pattern = "yyyy-MM")
    private YearMonth period;

    private boolean overwriteExisting;
}
