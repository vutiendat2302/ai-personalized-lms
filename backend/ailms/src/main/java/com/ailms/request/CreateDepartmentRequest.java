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

    @Size(max = 50, message = "Department code must not exceed 50 characters")
    private String code;

    @NotBlank(message = "Department name must not be blank")
    private String name;

    @Size(max = 3000, message = "Description must not exceed 3000 characters")
    private String description;
}
