package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.OrderItemTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

/**
 * Thực thể lưu trữ chi tiết từng mục sản phẩm / gói học nằm trong đơn hàng (OrderEntity).
 */
@Entity
@Table(name = "order_item", indexes = {
        @Index(name = "idx_order_item_order_id", columnList = "order_id"),
        @Index(name = "idx_order_item_course_package_id", columnList = "course_package_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrderItemEntity extends BaseEntity {

    /** Mã định danh mục đơn hàng (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Đơn hàng chứa mục sản phẩm này. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity orderEntity;

    /** Gói học được mua trong mục đơn hàng này. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_package_id", nullable = false)
    private CoursePackageEntity coursePackageEntity;

    /** Giá bán tại thời điểm mua (Price Snapshot để bảo lưu giá khi gói học đổi giá sau này). */
    @Column(name = "price_snapshot", nullable = false, precision = 15, scale = 2)
    private BigDecimal priceSnapshot;

    /** Loại mục sản phẩm (COURSE_PACKAGE, RE_ENROLLMENT, CERTIFICATE_FEE). */
    @Column(name = "item_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private OrderItemTypeEnum itemType;

    /** Lượt ghi danh được tạo ra sau khi mục đơn hàng này thanh toán thành công. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_enrollment_id")
    private EnrollmentEntity relatedEnrollment;
}
