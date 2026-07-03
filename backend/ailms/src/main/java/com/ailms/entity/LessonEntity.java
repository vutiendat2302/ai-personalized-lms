package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.w3c.dom.Text;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lesson", indexes = {
        @Index(name = "idx_lesson_section_id", columnList = "section_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LessonEntity extends BaseEntity {
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSectionEntity courseSectionEntity;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * VIDEO / PDF / TEXT / LIVE
     */
    @Column(name = "content_type", length = 20)
    private String contentType;

    @Column(name = "content_url", length = 500)
    private String contentUrl;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration_min")
    private Integer durationMin;

    /**
     * true = bài học xem thử miễn phí, false = phải đăng ký
     */
    @Column(name = "is_preview", nullable = false)
    @Builder.Default
    private Boolean isPreview = false;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    /**
     * 1 = Active, 0 = Inactive
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Byte status = 1;

    @OneToMany(mappedBy = "lessonEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LessonResourceEntity> resources = new ArrayList<>();
}
