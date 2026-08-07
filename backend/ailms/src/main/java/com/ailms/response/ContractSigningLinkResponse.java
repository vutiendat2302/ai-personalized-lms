package com.ailms.response;

import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.SigningStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Trả về thông tin tóm tắt hợp đồng và link preview file công ty đã ký cho nhân viên xem trước qua link public.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractSigningLinkResponse {

    private String employeeName;
    private String employeeEmail;
    private String employeePhone;
    private ContractTypeEnum contractTypeEnum;
    private BigDecimal baseSalary;
    private LocalDate startDate;
    private LocalDate endDate;
    private SigningStatusEnum signingStatus;

    /** Presigned URL xem trước tệp PDF công ty đã ký. */
    private String companySignedFileUrl;

    /** Thời điểm token ký hết hạn. */
    private LocalDateTime tokenExpiresAt;

    /** Đánh dấu xem OTP đã được sinh và gửi về email chưa. */
    private boolean otpSent;
}
