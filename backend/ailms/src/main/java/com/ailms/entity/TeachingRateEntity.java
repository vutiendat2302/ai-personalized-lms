package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Luu tru don gia giang day cua giang vien
 */
@Entity
@Table(name = "teaching_rate")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TeachingRateEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    @Column(name = "class_id", nullable = false)
    private Long classId;

//    Don gia duoc ap dung
    @Column(name = "rate", precision = 12, scale = 2)
    private BigDecimal rate;

//    Thoi diem bat dau co hieu luc
    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

//    Thoi diem het hieu luc
    @Column(name = "effective_to")
    private LocalDateTime effectiveTo;

//    Trang thai cua ban ghi don gia
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private BaseStatusEnum status;
}
