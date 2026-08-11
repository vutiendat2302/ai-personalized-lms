package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/** Bình luận hoặc câu trả lời thuộc một bài đăng trong lớp. */
@Entity
@Table(name = "class_stream_comment", indexes = {
        @Index(name = "idx_class_stream_comment_post", columnList = "post_id, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ClassStreamCommentEntity extends BaseEntity {
    /** Mã bình luận Snowflake. */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Bài đăng chứa bình luận. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private ClassStreamPostEntity postEntity;

    /** Người tạo bình luận. */
    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    /** Nội dung văn bản thuần của bình luận. */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Đánh dấu nội dung đã bị staff ẩn. */
    @Column(name = "hidden", nullable = false)
    @Builder.Default
    private Boolean hidden = false;
}
