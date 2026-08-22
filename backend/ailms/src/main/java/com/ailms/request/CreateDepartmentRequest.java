package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDepartmentRequest {

    @NotBlank(message = "Department name must not be blank")
    @Size(max = 255, message = "Department name must not exceed 255 characters")
    private String name;

    @Size(max = 3000, message = "Description must not exceed 3000 characters")
    private String description;
}
