package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.entity.enums.FileUsageTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể quản lý metadata thông tin tập tin đính kèm được tải lên hệ thống (lưu trữ trên MinIO / Cloud Storage).
 */
@Entity
@Table(name = "file_metadata", indexes = {
        @Index(name = "idx_file_metadata_file_key", columnList = "file_key", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FileMetadataEntity extends BaseEntity {

    /** Mã định danh metadata tập tin (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Khóa lưu trữ tập tin duy nhất trên MinIO / Cloud Storage. */
    @Column(name = "file_key", nullable = false, unique = true)
    private String fileKey;

    /** Tên gốc của tập tin do người dùng tải lên. */
    @Column(name = "original_name", nullable = false)
    private String originalName;

    /** Kích thước tập tin (tính bằng bytes). */
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    /** Định dạng MIME type của tập tin (VD: application/pdf, image/png). */
    @Column(name = "content_type", length = 100)
    private String contentType;

    /** Phân loại loại file trong hệ thống (IMAGE, DOCUMENT, VIDEO, AUDIO, OTHER). */
    @Column(name = "file_type")
    @Enumerated(EnumType.STRING)
    private FileTypeEnum fileType;

    /** Trạng thái lưu trữ tập tin (ACTIVE, DELETED, ARCHIVED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Module sở hữu file: AVATAR, CONTRACT, QUIZ_ATTACHMENT, ASSIGNMENT, ASSIGNMENT_SUBMISSION, LESSON_RESOURCE, OTHER */
    @Column(name = "usage_type")
    @Enumerated(EnumType.STRING)
    private FileUsageTypeEnum usageType;

    /** ID của bản ghi đang sở hữu file (VD: employeeContractId, userId, quizId...), nullable nếu chưa gán hoặc đã mồ côi */
    @Column(name = "reference_entity_id")
    private Long referenceEntityId;

    /** Loại entity sở hữu (VD: "EmployeeContract", "User", "Quiz"), phục vụ hiển thị + điều hướng ngược */
    @Column(name = "reference_entity_type", length = 100)
    private String referenceEntityType;

    /** Đánh dấu thời điểm phát hiện file không còn được tham chiếu (dùng cho job quét mồ côi định kỳ) */
    @Column(name = "orphaned_detected_at")
    private LocalDateTime orphanedDetectedAt;
}
