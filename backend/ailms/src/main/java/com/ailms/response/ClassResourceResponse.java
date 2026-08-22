package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassResourceResponse {
    private Long id;
    private Long classId;
    private String title;
    private String fileKey;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private Long uploadedByUserId;
    private String uploadedByName;
    private String ragStatus;
    private Integer ragChunksCount;
    private String ragError;
    private Boolean canUseForAi;
    private LocalDateTime createdAt;
}
