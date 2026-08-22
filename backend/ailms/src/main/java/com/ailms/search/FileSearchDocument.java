package com.ailms.search;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import lombok.Builder;
import lombok.Getter;

import java.time.ZoneOffset;

/** Tài liệu phẳng được lưu trong index tập tin của Meilisearch. */
@Getter
@Builder
public class FileSearchDocument {
    private Long id;
    private String fileKey;
    private String originalName;
    private Long fileSize;
    private String contentType;
    private FileTypeEnum fileType;
    private BaseStatusEnum status;
    private Long createdBy;
    private Long createdAtEpoch;

    /** Chuyển entity metadata tập tin thành document phục vụ Meilisearch. */
    public static FileSearchDocument from(FileMetadataEntity file) {
        if (file == null) return null;
        return FileSearchDocument.builder()
                .id(file.getId())
                .fileKey(file.getFileKey())
                .originalName(file.getOriginalName())
                .fileSize(file.getFileSize())
                .contentType(file.getContentType())
                .fileType(file.getFileType())
                .status(file.getStatus())
                .createdBy(file.getCreatedBy())
                .createdAtEpoch(file.getCreatedAt() == null ? null : file.getCreatedAt().toInstant(ZoneOffset.UTC).toEpochMilli())
                .build();
    }
}
