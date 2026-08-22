package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.PreviewTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateLessonRequest {

    private String name;

    private String contentType;

    private String contentUrl;

    private String description;

    private Integer durationMin;

    private Integer durationSec;

    private Integer orderIndex;

    private PreviewTypeEnum previewType;

    private BaseStatusEnum status;

}
