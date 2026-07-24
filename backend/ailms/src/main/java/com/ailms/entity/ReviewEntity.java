package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.ReviewStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Thực thể lưu trữ đánh giá và nhận xét của học viên cho một khóa học.
 */
@Entity
@Table(name = "review", uniqueConstraints = {
        @UniqueConstraint(name = "uk_review_course_user", columnNames = {"course_id", "user_id"})
}, indexes = {
        @Index(name = "idx_review_course_id", columnList = "course_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ReviewEntity extends BaseEntity {

    /** Mã định danh đánh giá (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID khóa học được đánh giá. */
    @Column(name = "course_id", nullable = false)
    private Long courseId;

    /** ID học viên thực hiện đánh giá. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Khóa học được đánh giá. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", insertable = false, updatable = false)
    private CourseEntity courseEntity;

    /** Học viên thực hiện đánh giá. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity userEntity;

    /** Số sao đánh giá (từ 1 đến 5 sao). */
    @Column(name = "rating", nullable = false)
    private Integer rating; // 1 to 5 stars

    /** Nội dung bình luận / nhận xét chi tiết của học viên. */
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    /** Trạng thái duyệt bài đánh giá (ACTIVE, INACTIVE, REJECTED). */
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReviewStatusEnum status = ReviewStatusEnum.ACTIVE;

    /** Lý do từ chối hiển thị đánh giá (nếu bị từ chối do vi phạm quy chuẩn). */
    @Column(name = "rejection_reason")
    private String rejectionReason;
}
