package com.ailms.request;

import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateEmployeeContractRequest {

    @NotNull(message = "Mã nhân viên (employeeId) không được để trống")
    private Long employeeId;

    @NotNull(message = "Loại hợp đồng (contractTypeEnum) không được để trống")
    private ContractTypeEnum contractTypeEnum;

    @NotNull(message = "Mã mẫu hợp đồng (templateId) không được để trống")
    private Long templateId;

    @NotNull(message = "Ngày bắt đầu (startDate) không được để trống")
    private LocalDate startDate;

    private LocalDate endDate;

    @NotNull(message = "Mức lương cơ bản (baseSalary) không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Lương cơ bản phải lớn hơn 0")
    private BigDecimal baseSalary;

    @NotNull(message = "Hình thức trả lương (salaryTypeEnum) không được để trống")
    private SalaryTypeEnum salaryTypeEnum;

    private LocalDateTime signedAt;

    /** Map bổ sung chứa các dữ liệu placeholder tùy chỉnh từ FE nếu có. */
    private Map<String, String> customPlaceholders;
}
