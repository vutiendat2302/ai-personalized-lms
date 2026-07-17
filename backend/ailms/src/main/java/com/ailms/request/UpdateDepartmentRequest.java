package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDepartmentRequest {
    private String name;

    @Size(max = 3000, message = "Description must not exceed 3000 characters")
    private String description;

    private BaseStatusEnum status;
}
