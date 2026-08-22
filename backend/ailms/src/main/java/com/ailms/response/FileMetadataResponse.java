package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.ailms.entity.enums.FileUsageTypeEnum;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileMetadataResponse {
    private Long id;
    private String fileKey;
    private String originalName;
    private Long fileSize;
    private String contentType;
    private FileTypeEnum fileType;
    private FileUsageTypeEnum usageType;
    private Long referenceEntityId;
    private String referenceEntityType;
    private BaseStatusEnum status;

    /**
     * Tài nguyên không còn được tham chiếu đến
     */
    private boolean orphaned;

    /**
     * Thời điểm hệ thống phát hiện hợp đồng không còn được tham chiếu đến
     */
    private LocalDateTime orphanedDetectedAt;

    private Long createdBy;
    private String createdByName;
    private String createdByCode;
    private Long updatedBy;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}
