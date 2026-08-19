package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSectionRequest {

    @NotBlank(message = "Section name must not be blank")
    @Size(max = 100, message = "Section name must not exceed 100 characters")
    private String name;

    private Integer orderIndex;

    /** Course ID chỉ bắt buộc với endpoint CRUD chung; authoring endpoint lấy ID từ path. */
    private Long courseId;

}
