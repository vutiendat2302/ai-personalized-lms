package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Hop dong lao dong cua nhan vien
 */
@Entity
@Table(name = "employee_contract")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeeContractEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

//    Loai hop dong lao dong
    @Column(name = "contract_type")
    @Enumerated(EnumType.STRING)
    private ContractTypeEnum contractTypeEnum;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

//    Muc luong co ban theo hop dong
    @Column(name = "base_salary", precision = 12, scale = 2)
    private BigDecimal baseSalary;

//    Duong dan toi tep hop dong da luu tru
    @Column(name = "file_url")
    private String fileUrl;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_metadata_id")
    private FileMetadataEntity fileMetadata;

//    Trang thai hop dong
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private BaseStatusEnum baseStatusEnum;

//    Thoi diem duoc ky ket
    @Column(name = "signed_at")
    private LocalDateTime signedAt;
}
