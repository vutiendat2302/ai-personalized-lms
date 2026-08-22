package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import com.ailms.entity.enums.ClassStreamPostTypeEnum;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassStreamPostResponse {
    private Long id;
    private Long classId;
    private Long authorUserId;
    private Long authorId;
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
    private LocalDateTime updatedAt;
    private ClassStreamPostTypeEnum type;
    private Boolean pinned;
    private Boolean commentLocked;
    private Long commentCount;
}
