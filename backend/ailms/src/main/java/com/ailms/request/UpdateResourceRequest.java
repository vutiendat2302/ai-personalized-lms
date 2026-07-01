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
public class UpdateResourceRequest {

    @NotBlank(message = "Resource name must not be blank")
    @Size(max = 255, message = "Resource name must not exceed 255 characters")
    private String name;

    @NotBlank(message = "File URL must not be blank")
    @Size(max = 500, message = "File URL must not exceed 500 characters")
    private String fileUrl;

    @Size(max = 20, message = "File type must not exceed 20 characters")
    private String fileType;

    private Long fileSize;

    @NotNull(message = "Status is required")
    private Byte status;

}
