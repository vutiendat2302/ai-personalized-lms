package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import com.ailms.entity.enums.SalaryTypeEnum;
import com.ailms.entity.enums.SigningStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin hợp đồng lao động của nhân viên.
 */
@Entity
@Table(name = "employee_contract")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeeContractEntity extends BaseEntity {

    /** Mã định danh hợp đồng (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Nhân viên ký kết hợp đồng. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    /** Loại hợp đồng lao động (INDEFINITE, FIXED_TERM, PROBATION, SEASONAL). */
    @Column(name = "contract_type")
    @Enumerated(EnumType.STRING)
    private ContractTypeEnum contractTypeEnum;

    /** Ngày hợp đồng có hiệu lực. */
    @Column(name = "start_date")
    private LocalDate startDate;

    /** Ngày hết hạn hợp đồng (null nếu là hợp đồng vô thời hạn). */
    @Column(name = "end_date")
    private LocalDate endDate;

    /** Mức lương cơ bản thỏa thuận theo hợp đồng. */
    @Column(name = "base_salary", precision = 12, scale = 2)
    private BigDecimal baseSalary;

    /** Hình thức trả lương (HOURLY, DAILY, MONTHLY). */
    @Column(name = "salary_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SalaryTypeEnum salaryTypeEnum = SalaryTypeEnum.DAILY;

    /** Key lưu trữ file hợp đồng đã tải lên MinIO. */
    @Column(name = "file_key")
    private String fileKey;

    /** Metadata thông tin tập tin file hợp đồng đính kèm (bản mới nhất sau khi ký). */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_metadata_id")
    private FileMetadataEntity fileMetadata;

    /** Metadata thông tin file gốc ban đầu trước khi hai bên ký điện tử. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_file_metadata_id")
    private FileMetadataEntity originalFileMetadata;

    /** Trạng thái hợp đồng (ACTIVE, EXPIRED, TERMINATED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Trạng thái quy trình ký điện tử (PENDING_COMPANY_SIGN, PENDING_EMPLOYEE_SIGN, FULLY_SIGNED). */
    @Column(name = "signing_status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SigningStatusEnum signingStatus = SigningStatusEnum.PENDING_COMPANY_SIGN;

    /** Token ngẫu nhiên (UUID) phục vụ đường dẫn ký công khai dành cho nhân viên. */
    @Column(name = "signing_token")
    private String signingToken;

    /** Thời điểm hết hạn của token ký (mặc định 7 ngày). */
    @Column(name = "signing_token_expires_at")
    private LocalDateTime signingTokenExpiresAt;

    /** Thời điểm hai bên thực hiện ký kết hợp đồng. */
    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    /** Thời điểm chấm dứt hợp đồng. */
    @Column(name = "terminated_at")
    private LocalDateTime terminatedAt;

    /** Lý do chấm dứt hợp đồng. */
    @Column(name = "termination_reason", length = 500)
    private String terminationReason;
}
