package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Nội dung cho phép tác giả cập nhật trên bài đăng của mình. */
@Getter
@Setter
public class UpdateClassStreamPostRequest {
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    @NotBlank(message = "Content cannot be blank")
    @Size(max = 20000, message = "Content cannot exceed 20000 characters")
    private String content;
}
