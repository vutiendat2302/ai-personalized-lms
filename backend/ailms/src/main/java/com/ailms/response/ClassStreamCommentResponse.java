package com.ailms.response;

import lombok.*;
import java.time.LocalDateTime;

/** Dữ liệu bình luận an toàn trả về cho thành viên lớp. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassStreamCommentResponse {
    private Long id;
    private Long postId;
    private Long authorId;
    private String authorName;
    private String authorAvatar;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
