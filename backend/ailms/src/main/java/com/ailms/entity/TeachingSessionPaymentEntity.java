package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.SessionPaymentStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Luu tru thong tin thanh toan cho mot buoi day hoc
 */
@Entity
@Table(name = "teaching_session_payment", uniqueConstraints = {
        @UniqueConstraint(name = "uk_class_online_id", columnNames = {"class_online_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class  TeachingSessionPaymentEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

//    lop hoc truc tuyen
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_online_id")
    private ClassOnlineEntity classOnline;

//    Giang vien
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private EmployeeEntity employee;

//    Bang don gia duoc ap dung
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rate_id")
    private TeachingRateEntity teachingRate;

//    Don gia duoc ap dung khi tinh luong, tai thoi diem do
    @Column(name = "rate_applied", precision = 12, scale = 2)
    private BigDecimal rateApplied;

//    Thoi luong giang day thuc te
    @Column(name = "actual_duration_min")
    @Builder.Default
    private int actualDurationMin = 0;

//    So tien thanh toan cho buoi day
    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

//    Trang thai
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SessionPaymentStatusEnum status = SessionPaymentStatusEnum.PENDING;

    @Column(name = "description")
    private String description;
}
