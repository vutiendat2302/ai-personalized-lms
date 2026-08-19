package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.PreviewTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Thực thể lưu trữ bài học thuộc một chương học (CourseSectionEntity).
 * Hỗ trợ nhiều loại nội dung: VIDEO, PDF, TEXT, LIVE...
 */
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

    /** Mã định danh bài học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Chương/Phần học chứa bài học này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSectionEntity courseSectionEntity;

    /** Tên bài học. */
    @Column(name = "name", length = 100)
    private String name;

    /**
     * Định dạng nội dung chính của bài học (VIDEO, PDF, TEXT, LIVE, QUIZ, ASSIGNMENT).
     */
    @Column(name = "content_type", length = 20)
    private String contentType;

    /** Đường dẫn URL hoặc key MinIO lưu trữ file nội dung bài học. */
    @Column(name = "content_url", length = 500)
    private String contentUrl;

    /** Mô tả hoặc nội dung văn bản chi tiết của bài học. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Thời lượng bài học ước tính (tính theo phút). */
    @Column(name = "duration_min")
    private Integer durationMin;

    /** Thời lượng media thực tế tính theo giây; dùng cho VIDEO/AUDIO. */
    @Column(name = "duration_sec")
    private Integer durationSec;

    /** Loại xem thử (FREE, LOCKED). */
    @Column(name = "preview_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PreviewTypeEnum previewType = PreviewTypeEnum.LOCKED; // "FREE", "LOCKED"

    /** Thứ tự hiển thị của bài học trong chương. */
    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    /**
     * Trạng thái hoạt động
     */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Danh sách tài liệu đính kèm kèm theo bài học. */
    @OneToMany(mappedBy = "lessonEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LessonResourceEntity> resources = new ArrayList<>();
}
