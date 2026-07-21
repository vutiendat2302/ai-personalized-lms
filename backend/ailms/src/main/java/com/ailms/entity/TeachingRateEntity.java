package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ đơn giá thù lao giảng dạy của giảng viên (theo giờ/buổi/lớp).
 */
@Entity
@Table(name = "teaching_rate")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TeachingRateEntity extends BaseEntity {

    /** Mã định danh đơn giá giảng dạy (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Giảng viên được áp dụng đơn giá. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private EmployeeEntity employeeEntity;

    /** Lớp học cụ thể được áp dụng đơn giá (null nếu áp dụng chung). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    /** Đơn giá giảng dạy (VNĐ / giờ hoặc VNĐ / buổi). */
    @Column(name = "rate", precision = 12, scale = 2)
    private BigDecimal rate;

    /** Thời điểm bắt đầu có hiệu lực áp dụng đơn giá. */
    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    /** Thời điểm kết thúc hiệu lực áp dụng (null nếu đang áp dụng hiện tại). */
    @Column(name = "effective_to")
    private LocalDateTime effectiveTo;

    /** Trạng thái của bản ghi đơn giá (ACTIVE, INACTIVE). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Ghi chú chi tiết về căn cứ thiết lập đơn giá. */
    @Column(name = "description")
    private String description;
}
