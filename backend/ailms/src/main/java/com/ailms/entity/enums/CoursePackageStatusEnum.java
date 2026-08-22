package com.ailms.entity.enums;

/**
 * Trạng thái của gói khóa học.
 * ACTIVE   : Đang hoạt động và có thể đăng ký.
 * INACTIVE : Không hoạt động và bị ẩn khỏi shop.
 * OUT_OF_STOCK : Gói đang hoạt động nhưng lớp liên kết đã hết chỗ.
 */
public enum CoursePackageStatusEnum {
    ACTIVE,
    INACTIVE,
    OUT_OF_STOCK
}
