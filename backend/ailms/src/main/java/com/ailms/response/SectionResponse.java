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
public class SectionResponse {

    private Long id;

    private Long courseId;
    private String courseName;

    private String name;

    private Integer orderIndex;

    private BaseStatusEnum status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

}
