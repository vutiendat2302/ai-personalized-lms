package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CreateLessonRequest {

    @NotBlank(message = "Lesson name must not be blank")
    @Size(max = 100, message = "Lesson name must not exceed 100 characters")
    private String name;

    @Size(max = 20, message = "Content type must not exceed 20 characters")
    private String contentType;

    @Size(max = 500, message = "Content URL must not exceed 500 characters")
    private String contentUrl;

    private String description;

    private Integer durationMin;

    @Builder.Default
    private Boolean isPreview = false;

    private Integer orderIndex;

}
