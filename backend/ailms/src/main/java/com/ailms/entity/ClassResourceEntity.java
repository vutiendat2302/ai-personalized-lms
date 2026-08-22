package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.RagProcessingStatusEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Kho lưu trữ tài liệu của lớp học
 */
@Entity
@Table(name = "class_resource", indexes = {
        @Index(name = "idx_class_resource_class_id", columnList = "class_id, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ClassResourceEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassEntity classEntity;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "file_key", nullable = false)
    private String fileKey;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "uploaded_by_user_id", nullable = false)
    private Long uploadedByUserId;

    /** Trạng thái xử lý embedding để UI chỉ cho chọn nguồn đã sẵn sàng. */
    @Enumerated(EnumType.STRING)
    @Column(name = "rag_status", nullable = false, length = 20)
    @Builder.Default
    private RagProcessingStatusEnum ragStatus = RagProcessingStatusEnum.PENDING;

    /** Số chunk đã được upsert vào Qdrant cho resource hiện tại. */
    @Column(name = "rag_chunks_count", nullable = false)
    @Builder.Default
    private Integer ragChunksCount = 0;

    /** Thông báo lỗi ingestion rút gọn, không chứa nội dung tài liệu. */
    @Column(name = "rag_error", length = 500)
    private String ragError;
}
