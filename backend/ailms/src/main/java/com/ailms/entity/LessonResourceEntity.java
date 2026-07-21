package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Thực thể lưu trữ các tài liệu đính kèm (PDF, DOCX, ZIP, Slide...) của bài học.
 */
@Entity
@Table(name = "lesson_resource", indexes = {
        @Index(name = "idx_resource_lesson_id", columnList = "lesson_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LessonResourceEntity extends BaseEntity {

    /** Mã định danh tài nguyên đính kèm (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Bài học chứa tài liệu đính kèm này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private LessonEntity lessonEntity;

    /** Tên hiển thị của tài liệu đính kèm. */
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /** Đường dẫn URL hoặc key file MinIO của tài liệu. */
    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    /** Metadata thông tin chi tiết của file lưu trên MinIO. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_metadata_id")
    private FileMetadataEntity fileMetadata;

    /**
     * Định dạng file tài liệu (PDF, ZIP, DOCX, PPTX...).
     */
    @Column(name = "file_type", length = 20)
    private String fileType;

    /**
     * Kích thước file (tính bằng bytes).
     */
    @Column(name = "file_size")
    private Long fileSize;

    /**
     * Trạng thái hoạt động (1 = Active, 0 = Inactive).
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Byte status = 1;
}
