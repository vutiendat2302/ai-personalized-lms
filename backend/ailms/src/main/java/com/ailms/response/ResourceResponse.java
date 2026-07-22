package com.ailms.response;

import com.ailms.entity.enums.BaseStatusEnum;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResourceResponse {

    private Long id;

    private Long lessonId;

    private String name;

    private String fileUrl;

    private String fileType;

    private Long fileSize;

    private BaseStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

}
