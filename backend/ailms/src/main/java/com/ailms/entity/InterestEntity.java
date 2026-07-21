package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Danh mục sở thích / lĩnh vực học viên muốn tìm hiểu, phát triển.
 */
@Entity
@Table(name = "interest", uniqueConstraints = {
        @UniqueConstraint(name = "uk_interest_code", columnNames = {"code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class InterestEntity extends BaseEntity {

    /** Mã định danh sở thích (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Mã định danh sở thích (VD: IT_PROGRAMMING, GRAPHIC_DESIGN, MUSIC). */
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    /** Tên hiển thị của sở thích (VD: Lập trình máy tính, Thiết kế đồ họa). */
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /** Mô tả chi tiết về sở thích / lĩnh vực quan tâm. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Trạng thái hoạt động (1 = Active, 0 = Inactive).
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Byte status = 1;

    /** Danh sách liên kết học viên quan tâm đến sở thích này. */
    @OneToMany(mappedBy = "interest", fetch = FetchType.LAZY)
    @Builder.Default
    private List<StudentInterestEntity> studentInterests = new ArrayList<>();
}
