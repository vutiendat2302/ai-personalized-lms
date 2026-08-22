package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import com.ailms.entity.enums.ClassStreamPostTypeEnum;

/**
 * Lưu trữ các bài đăng trên bảng tin của lớp học
 */
@Entity
@Table(name = "class_stream_post", indexes = {
        @Index(name = "idx_class_stream_post_class_id", columnList = "class_id, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ClassStreamPostEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassEntity classEntity;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    /** Loại câu hỏi, thảo luận hoặc thông báo. */
    @Enumerated(EnumType.STRING)
    @Column(name = "post_type", nullable = false, length = 20)
    @Builder.Default
    private ClassStreamPostTypeEnum type = ClassStreamPostTypeEnum.DISCUSSION;

    @Column(name = "title")
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_key")
    private String fileKey;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    /** Cho biết bài đang được staff ghim. */
    @Column(name = "pinned", nullable = false)
    @Builder.Default
    private Boolean pinned = false;

    /** Cho biết bài đã khóa nhận bình luận mới. */
    @Column(name = "comment_locked", nullable = false)
    @Builder.Default
    private Boolean commentLocked = false;

    /** Cho biết nội dung đã bị staff ẩn khỏi danh sách. */
    @Column(name = "hidden", nullable = false)
    @Builder.Default
    private Boolean hidden = false;
}
