package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.UserStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể đại diện cho tài khoản người dùng trong hệ thống.
 * Chứa thông tin đăng nhập, thông tin cá nhân cơ bản và trạng thái tài khoản.
 */
@Getter
@Setter
@Entity
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user", indexes = {
        @Index(name = "idx_user_username", columnList = "username", unique = true),
        @Index(name = "idx_user_email", columnList = "email", unique = true)
})
public class UserEntity extends BaseEntity{

    /**
     * Mã định danh người dùng (Snowflake ID 64-bit).
     */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /**
     * Tên đăng nhập của người dùng.
     * Được sử dụng để đăng nhập và phải là duy nhất.
     */
    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;

    /**
     * Địa chỉ email của người dùng.
     * Được sử dụng để nhận thông báo, khôi phục mật khẩu và phải là duy nhất.
     */
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    /**
     * Mật khẩu đã được mã hóa (băm) bằng BCrypt.
     */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    /**
     * Họ và tên đầy đủ của người dùng.
     */
    @Column(name = "full_name")
    private String fullName;

    /**
     * Số điện thoại liên hệ.
     */
    @Column(name = "phone", length = 20)
    private String phone;

    /**
     * Đường dẫn hoặc URL ảnh đại diện của người dùng.
     */
    @Column(name = "avatar_url")
    private String avatarUrl;

    /**
     * Giới tính của người dùng.
     * 0 - Nam
     * 1 - Nữ
     * 2 - Khác
     */
    @Column(name = "gender")
    private Integer gender; // tinyint mapping to Integer (0,1,2...)

    /**
     * Ngày sinh của người dùng.
     */
    @Column(name = "date_of_birth")
    private LocalDateTime dateOfBirth;

    /**
     * Thông tin mở rộng của người dùng.
     * Được lưu dưới dạng JSON để dễ dàng bổ sung
     * các thuộc tính mới mà không cần thay đổi cấu trúc bảng.
     */
    @Column(name = "attributes", columnDefinition = "json")
    private String attributes; // store as JSON string, can be parsed when needed

    /**
     * Trạng thái tài khoản.
     * Giá trị được lưu dưới dạng chuỗi (EnumType.STRING).
     * INACTIVE
     * ACTIVE
     * LOCKED
     * PENDING_VERIFICATION
     */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserStatusEnum status = UserStatusEnum.INACTIVE;

    /**
     * Thời điểm người dùng đăng nhập gần nhất.
     * Được cập nhật sau mỗi lần đăng nhập thành công.
     */
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
}
