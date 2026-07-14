package com.ailms.response;

import com.ailms.entity.BaseStatusEnum;
import com.ailms.entity.FileTypeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private BaseStatusEnum status;
}
