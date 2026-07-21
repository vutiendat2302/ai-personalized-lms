package com.ailms.request;

import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSectionRequest {

    @NotBlank(message = "Section name must not be blank")
    @Size(max = 100, message = "Section name must not exceed 100 characters")
    private String name;

    private Integer orderIndex;

    @NotNull(message = "Status is required")
    private BaseStatusEnum status;

    @NotNull
    private Long courseId;

}
