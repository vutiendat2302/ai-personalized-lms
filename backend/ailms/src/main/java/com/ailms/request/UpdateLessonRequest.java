package com.ailms.request;

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

    @NotBlank(message = "Lesson name must not be blank")
    @Size(max = 100, message = "Lesson name must not exceed 100 characters")
    private String name;

    @Size(max = 20, message = "Content type must not exceed 20 characters")
    private String contentType;

    @Size(max = 500, message = "Content URL must not exceed 500 characters")
    private String contentUrl;

    private String description;

    private Integer durationMin;

    @NotNull(message = "isPreview flag is required")
    private Boolean isPreview;

    private Integer orderIndex;

    @NotNull(message = "Status is required")
    private Byte status;

}
