package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.ailms.entity.enums.ClassStreamPostTypeEnum;
import jakarta.validation.constraints.Size;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateClassStreamPostRequest {
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    @NotBlank(message = "Content cannot be blank")
    @Size(max = 20000, message = "Content cannot exceed 20000 characters")
    private String content;

    private String fileKey;
    private String fileName;
    private String fileType;
    private Long fileSize;

    private ClassStreamPostTypeEnum type;
}
