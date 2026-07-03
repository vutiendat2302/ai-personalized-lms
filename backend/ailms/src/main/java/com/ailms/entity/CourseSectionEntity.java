package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "course_section", indexes = {
        @Index(name = "idx_section_course_id", columnList = "course_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseSectionEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    /**
     * 1 = Active, 0 = Inactive
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Byte status = 1;

    @OneToMany(mappedBy = "courseSectionEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<LessonEntity> lessonEntities = new ArrayList<>();


}
