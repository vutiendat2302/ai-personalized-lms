package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Thực thể danh mục khóa học (VD: Lập trình, Ngoại ngữ, Kỹ năng mềm, Thiết kế...).
 */
@Entity
@Table(name = "category")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CategoryEntity extends BaseEntity {

    /** Mã định danh danh mục (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Tên danh mục khóa học. */
    @Column(name = "name", length = 100)
    private String name;

    /** Mô tả chi tiết về danh mục khóa học. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Trạng thái hoạt động (ACTIVE, INACTIVE).
     */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Danh sách các khóa học thuộc danh mục này. */
    @OneToMany(mappedBy = "categoryEntity", fetch = FetchType.LAZY)
    @Builder.Default
    private List<CourseEntity> courses = new ArrayList<>();
}
