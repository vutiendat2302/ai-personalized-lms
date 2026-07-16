package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private EmployeeEntity employeeEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

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
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    @Column(name = "description")
    private String description;
}
