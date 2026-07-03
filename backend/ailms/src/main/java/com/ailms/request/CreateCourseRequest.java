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
public class CreateCourseRequest {

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotBlank(message = "Course name must not be blank")
    @Size(max = 100, message = "Course name must not exceed 100 characters")
    private String name;

    @Size(max = 255, message = "Link must not exceed 255 characters")
    private String link;

    private String description;

    @Size(max = 20, message = "Level must not exceed 20 characters")
    private String level;

}
