package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

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

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private LessonEntity lessonEntity;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_metadata_id")
    private FileMetadataEntity fileMetadata;

    /**
     * PDF / ZIP / DOCX / PPTX
     */
    @Column(name = "file_type", length = 20)
    private String fileType;

    /**
     * File size tính bằng bytes
     */
    @Column(name = "file_size")
    private Long fileSize;

    /**
     * 1 = Active, 0 = Inactive
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Byte status = 1;
}
