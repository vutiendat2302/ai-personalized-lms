package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "course_package", indexes = {
        @Index(name = "idx_course_package_course_id", columnList = "course_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CoursePackageEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "delivery_mode", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private DeliveryModeEnum deliveryMode;

    @Column(name = "price", nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(name = "original_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal originalPrice;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(name = "included_tutor_sessions")
    private Integer includedTutorSessions;

    @Column(name = "max_group_size")
    private Integer maxGroupSize;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private CoursePackageStatusEnum status;
}
