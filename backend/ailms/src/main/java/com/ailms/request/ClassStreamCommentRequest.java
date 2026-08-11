package com.ailms.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** Nội dung tạo hoặc sửa bình luận trong thảo luận lớp. */
@Getter
@Setter
public class ClassStreamCommentRequest {
    @NotBlank(message = "Comment content cannot be blank")
    @Size(max = 5000, message = "Comment content cannot exceed 5000 characters")
    private String content;
}
