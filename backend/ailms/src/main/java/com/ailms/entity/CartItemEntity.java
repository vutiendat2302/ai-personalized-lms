package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;


/**
 * Thực thể lưu trữ các gói học / khóa học mà học viên đã thêm vào giỏ hàng trước khi đặt hàng thanh toán.
 */
@Entity
@Table(name = "cart_item", uniqueConstraints = {
        @UniqueConstraint(name = "uk_cart_user_package", columnNames = {"user_id", "course_package_id"})
}, indexes = {
        @Index(name = "idx_cart_item_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CartItemEntity extends BaseEntity {

    /** Mã định danh mục giỏ hàng (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Học viên sở hữu giỏ hàng này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity userEntity;

    /** Gói học được chọn thêm vào giỏ hàng. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_package_id")
    private CoursePackageEntity coursePackageEntity;

    /** Bản nháp nhu cầu 1-1, chỉ được chuyển thành matching request sau khi thanh toán thành công. */
    @Column(name = "one_on_one_needs", columnDefinition = "TEXT")
    private String oneOnOneNeeds;
}
