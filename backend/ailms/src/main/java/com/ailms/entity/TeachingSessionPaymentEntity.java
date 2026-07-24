package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.SessionPaymentStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Thực thể lưu trữ thông tin tính toán thù lao thanh toán cho từng buổi dạy học trực tuyến.
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
public class TeachingSessionPaymentEntity extends BaseEntity {

    /** Mã định danh thanh toán buổi dạy (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Buổi học trực tuyến tương ứng được tính thù lao. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_online_id")
    private ClassOnlineEntity classOnline;

    /** Giảng viên thực hiện buổi dạy. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private EmployeeEntity employee;

    /** Đơn giá thù lao được áp dụng cho buổi dạy này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rate_id")
    private TeachingRateEntity teachingRate;

    /** Giá trị đơn giá thực tế được áp dụng tại thời điểm tính thù lao. */
    @Column(name = "rate_applied", precision = 12, scale = 2)
    private BigDecimal rateApplied;

    /** Thời lượng giảng dạy thực tế của buổi học (tính theo phút). */
    @Column(name = "actual_duration_min")
    @Builder.Default
    private int actualDurationMin = 0;

    /** Tổng số tiền thù lao thanh toán cho buổi dạy. */
    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    /** Trạng thái quyết toán thù lao buổi dạy (PENDING, CALCULATED, APPROVED, PAID, REJECTED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SessionPaymentStatusEnum status = SessionPaymentStatusEnum.PENDING;

    /** Ghi chú giải trình hoặc thông tin bổ sung về buổi dạy. */
    @Column(name = "description")
    private String description;
}
