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
public class ClassStreamPostResponse {
    private Long id;
    private Long classId;
    private Long authorUserId;
    private String authorName;
    private String authorAvatar;
    private String title;
    private String content;
    private String fileKey;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String fileUrl;
    private LocalDateTime createdAt;
}
