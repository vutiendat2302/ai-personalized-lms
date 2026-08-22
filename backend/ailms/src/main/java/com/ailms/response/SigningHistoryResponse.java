package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Trả về thông tin nhật ký kiểm toán cho quy trình ký điện tử hợp đồng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SigningHistoryResponse {

    private Long id;
    private String action; // CONTRACT_SIGNED_COMPANY hoặc CONTRACT_SIGNED_EMPLOYEE
    private String signerFullName;
    private String signerEmail;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime occurredAt;
    private String detailsJson;
}
