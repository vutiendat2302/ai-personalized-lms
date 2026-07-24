package com.ailms.request;

import com.ailms.entity.enums.PreviewTypeEnum;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CreateLessonRequest {

    private Long sectionId;

    private String name;

    private String contentType;

    private String contentUrl;

    private String description;

    private Integer durationMin;

    private Integer orderIndex;

    private PreviewTypeEnum previewType;

}
