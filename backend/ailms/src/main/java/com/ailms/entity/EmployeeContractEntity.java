package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Column(name = "contract_type")
    @Enumerated(EnumType.ORDINAL)
    private ContractType contractType;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "base_salary", precision = 12, scale = 2)
    private BigDecimal baseSalary;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "status")
    @Enumerated(EnumType.ORDINAL)
    private ContractStatus status;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;
}
