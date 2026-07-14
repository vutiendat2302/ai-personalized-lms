package com.ailms.request;

import com.ailms.entity.FileTypeEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFileMetadataRequest {
    @NotBlank(message = "fileKey không được để trống")
    private String fileKey;

    @NotBlank(message = "originalName không được để trống")
    private String originalName;

    @NotNull(message = "fileSize không được để trống")
    @Positive(message = "fileSize phải lớn hơn 0")
    private Long fileSize;

    private String contentType;

    @NotNull(message = "fileType không được để trống")
    private FileTypeEnum fileType;
}
