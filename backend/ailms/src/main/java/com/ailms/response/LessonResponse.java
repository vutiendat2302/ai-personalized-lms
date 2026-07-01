package com.ailms.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonResponse {

    private Long id;

    private Long sectionId;

    private String name;

    private String contentType;

    private String contentUrl;

    private String description;

    private Integer durationMin;

    private Boolean isPreview;

    private Integer orderIndex;

    private Byte status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

}
