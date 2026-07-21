package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.GuardianRelationship;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Thực thể lưu trữ thông tin Phụ huynh / Người giám hộ của học viên (đặc biệt đối với học viên vị thành niên).
 */
@Entity
@Table(name = "guardian")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class GuardianEntity extends BaseEntity {

    /** Mã định danh người giám hộ (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Hồ sơ học viên được giám hộ. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_user_id", nullable = false)
    private StudentProfileEntity studentProfile;

    /** Họ và tên người giám hộ. */
    @Column(name = "full_name", nullable = false)
    private String fullName;

    /** Mối quan hệ với học viên (FATHER, MOTHER, GUARDIAN, OTHER). */
    @Column(name = "relationship")
    @Enumerated(EnumType.ORDINAL)
    private GuardianRelationship relationship;

    /** Số điện thoại liên hệ của người giám hộ. */
    @Column(name = "phone", length = 20)
    private String phone;

    /** Địa chỉ email của người giám hộ. */
    @Column(name = "email")
    private String email;

    /** Địa chỉ thường trú / liên hệ của người giám hộ. */
    @Column(name = "address")
    private String address;
}
