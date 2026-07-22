package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Thực thể chương / phần học (Course Section) trong một khóa học.
 * Mỗi chương chứa danh sách các bài học (LessonEntity) được sắp xếp theo thứ tự `orderIndex`.
 */
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

    /** Mã định danh chương học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Khóa học chứa chương học này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private CourseEntity courseEntity;

    /** Tên chương học (VD: Chương 1: Tổng quan về Java). */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** Thứ tự hiển thị của chương học trong khóa học. */
    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    /**
     * Trạng thái hoạt động (ACTIVE, INACTIVE).
     */
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Danh sách các bài học thuộc chương này. */
    @OneToMany(mappedBy = "courseSectionEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<LessonEntity> lessonEntities = new ArrayList<>();
}
