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
public class UpdateResourceRequest {

    private String name;

    private Long fileMetadataId;

    private BaseStatusEnum status;

}
