package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "course", indexes = {
        @Index(name = "idx_course_category_id", columnList = "category_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private CategoryEntity categoryEntity;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * URL-friendly slug, unique. Ví dụ: "java-spring-boot-2024"
     */
    @Column(name = "link", nullable = false, unique = true, length = 255)
    private String link;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * BEGINNER / INTERMEDIATE / ADVANCED
     */
    @Column(name = "level", length = 20)
    private String level;

    /**
     * 0 = Draft, 1 = Published, 2 = Archived
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Byte status = 0;

    @OneToMany(mappedBy = "courseEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<CourseSectionEntity> sections = new ArrayList<>();
}
