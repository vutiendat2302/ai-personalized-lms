package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.CertificateStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Lưu trữ thông tin chứng chỉ được cấp cho học viên sau khi hoàn thành
 * khóa học và đáp ứng các điều kiện cấp chứng chỉ. Hỗ trợ tra cứu,
 * tải xuống và xác minh chứng chỉ công khai.
 */
@Entity
@Table(name = "certificate", indexes = {
        @Index(name = "idx_certificate_code", columnList = "certificate_code", unique = true),
        @Index(name = "idx_certificate_enrollment_id", columnList = "enrollment_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CertificateEntity extends BaseEntity {

    /** Mã định danh chứng chỉ (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID lượt ghi danh khóa học (Enrollment) tương ứng. */
    @Column(name = "enrollment_id")
    private Long enrollmentId;

    /** ID khóa học học viên hoàn thành để nhận chứng chỉ. */
    @Column(name = "course_id")
    private Long courseId;

    /** ID học viên nhận chứng chỉ. */
    @Column(name = "user_id")
    private Long userId;

    /** Mã chứng chỉ duy nhất để tra cứu / xác minh công khai (VD: CERT-2026-X8F9A). */
    @Column(name = "certificate_code")
    private String certificateCode;

    /** Trạng thái chứng chỉ (ISSUED = đã cấp, REVOKED = bị thu hồi). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CertificateStatusEnum status = CertificateStatusEnum.ISSUED;

    /** Thời điểm chứng chỉ được cấp chính thức. */
    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    /** Thời điểm chứng chỉ bị thu hồi (nếu bị hủy bỏ/thu hồi). */
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    /** Lý do thu hồi chứng chỉ (nếu có). */
    @Column(name = "revoked_reason")
    private String revokedReason;

    /** Đường dẫn URL tải file PDF/Ảnh chứng chỉ chính thức. */
    @Column(name = "download_url", length = 500)
    private String downloadUrl;

    private boolean valid;
}
