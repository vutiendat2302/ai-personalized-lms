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
public class CreateClassStreamPostRequest {
    private String title;

    @NotBlank(message = "Content cannot be blank")
    private String content;

    private String fileKey;
    private String fileName;
    private String fileType;
    private Long fileSize;
}
