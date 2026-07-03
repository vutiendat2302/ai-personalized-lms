package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "category")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CategoryEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * 1 = Active, 0 = Inactive
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Byte status = 1;

    @OneToMany(mappedBy = "categoryEntity", fetch = FetchType.LAZY)
    @Builder.Default
    private List<CourseEntity> courses = new ArrayList<>();
}
