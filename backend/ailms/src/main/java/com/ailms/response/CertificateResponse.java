package com.ailms.response;

import com.ailms.entity.enums.CertificateStatusEnum;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificateResponse {

    private Long id;

    private Long enrollmentId;

    private Long courseId;

//    private String courseName;

    private Long userId;

//    private String studentName;

    private String certificateCode;

    private CertificateStatusEnum status;

    private LocalDateTime issuedAt;

    private LocalDateTime revokedAt;

    private String revokedReason;

    private String downloadUrl;

    private boolean isValid;
}
