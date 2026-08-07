package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.CertificateConditionTypeEnum;
import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.entity.enums.CourseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Lưu trữ thông tin khóa học, bao gồm danh mục, nội dung mô tả,
 * trạng thái phê duyệt, đánh giá của học viên và điều kiện cấp
 * chứng chỉ sau khi hoàn thành khóa học.
 */

@Entity
@Table(name = "course", indexes = {
        @Index(name = "idx_course_category_id", columnList = "category_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CourseEntity extends BaseEntity {

    /** Mã định danh khóa học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Danh mục mà khóa học trực thuộc. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private CategoryEntity categoryEntity;

    /** Tên khóa học. */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * Đường dẫn tĩnh duy nhất (Slug URL-friendly, VD: "java-spring-boot-2024").
     */
    @Column(name = "link", nullable = false, unique = true, length = 255)
    private String link;

    /** Mô tả chi tiết nội dung và mục tiêu khóa học. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Giá bán gợi ý do giảng viên đề xuất.
     */
    @Column(name = "suggested_price", precision = 12, scale = 2)
    private BigDecimal suggestedPrice;

    /**
     * Trình độ yêu cầu của khóa học (BEGINNER, INTERMEDIATE, ADVANCED, ALL_LEVELS).
     */
    @Column(name = "level")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CourseLevelEnum level = CourseLevelEnum.BEGINNER;

    /** Trạng thái khóa học (DRAFT, PENDING, ACTIVE, REJECTED, INACTIVE, DELETED). */
    @Column(name = "status", length = 50)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CourseStatusEnum status = CourseStatusEnum.DRAFT;

    /** Lý do từ chối phê duyệt khóa học (nếu bị từ chối). */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    /** Điểm đánh giá trung bình từ học viên (thang điểm 1.0 - 5.0). */
    @Column(name = "avg_rating")
    @Builder.Default
    private Double avgRating = 0.0;

    /** Tổng số lượng lượt đánh giá từ học viên. */
    @Column(name = "review_count")
    @Builder.Default
    private Integer reviewCount = 0;

    /** Loại điều kiện cấp chứng chỉ (COMPLETION_RATE, FINAL_QUIZ, BOTH). */
    @Column(name = "certificate_condition_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CertificateConditionTypeEnum certificateConditionType = CertificateConditionTypeEnum.COMPLETION_RATE;

    /** Ngưỡng điểm/tỷ lệ phần trăm tối thiểu để đạt điều kiện nhận chứng chỉ (VD: 80%). */
    @Column(name = "certificate_pass_threshold")
    @Builder.Default
    private Integer certificatePassThreshold = 80;

    /** Lượt xem khóa học. */
    @Column(name = "view_count")
    @Builder.Default
    private Integer viewCount = 0;

    /** Số lượng học viên đăng ký tham gia khóa học. */
    @Column(name = "enrollment_count")
    @Builder.Default
    private Integer enrollmentCount = 0;

    /** Điểm số xu hướng thịnh hành. */
    @Column(name = "trending_score")
    @Builder.Default
    private Double trendingScore = 0.0;


    /** Danh sách các chương/phần học trong khóa học. */
    @OneToMany(mappedBy = "courseEntity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<CourseSectionEntity> sections = new ArrayList<>();
}
