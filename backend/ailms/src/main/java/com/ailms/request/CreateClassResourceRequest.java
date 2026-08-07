package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateClassResourceRequest {
    @NotBlank(message = "Title cannot be blank")
    private String title;

    @NotBlank(message = "File key cannot be blank")
    private String fileKey;

    private String fileName;
    private String fileType;
    private Long fileSize;
}
