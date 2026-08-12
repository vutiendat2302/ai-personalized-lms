package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.ailms.entity.enums.BaseStatusEnum;

/**
 * Thực thể lưu trữ thông tin bài kiểm tra trắc nghiệm (Quiz) trong khóa học hoặc bài học.
 */
@Entity
@Table(name = "quiz", indexes = {
        @Index(name = "idx_quiz_lesson_id", columnList = "lesson_id"),
        @Index(name = "idx_quiz_course_id", columnList = "course_id"),
        @Index(name = "idx_quiz_section_id", columnList = "section_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class QuizEntity extends BaseEntity {

    /** Mã định danh bài kiểm tra (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID bài học tương ứng (null nếu là quiz chương hoặc quiz cuối khóa). */
    @Column(name = "lesson_id")
    private Long lessonId;

    /** ID khóa học chứa bài kiểm tra. */
    @Column(name = "course_id")
    private Long courseId;

    /** ID chương học chứa bài kiểm tra. */
    @Column(name = "section_id")
    private Long sectionId;

    /** ID lớp nhận quiz; null nghĩa là quiz chung của khóa học. */
    @Column(name = "class_id")
    private Long classId;

    /** Mã định danh bài kiểm tra dạng chữ/số duy nhất. */
    @Column(name = "code")
    private String code;

    /** Tiêu đề bài kiểm tra trắc nghiệm. */
    @Column(name = "title")
    private String title;

    /** Mô tả chi tiết và quy định làm bài kiểm tra. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Thời gian giới hạn làm bài (tính bằng phút, null = không giới hạn). */
    @Column(name = "time_limit_min")
    private Integer timeLimitMin;

    /** Điểm số tối thiểu để đạt / đỗ bài kiểm tra (VD: 8.00 hoặc 80.00). */
    @Column(name = "pass_score", precision = 5, scale = 2)
    private BigDecimal passScore;

    /** Số lần tối đa học viên được làm lại bài kiểm tra (0 hoặc null = không giới hạn). */
    @Column(name = "max_attempts")
    private Integer maxAttempts;

    /** Xáo trộn thứ tự câu hỏi khi học viên bắt đầu làm bài (true = xáo trộn). */
    @Column(name = "shuffle_questions")
    private Boolean shuffleQuestions;

    /** Thời điểm đóng bài quiz/thi đối với học viên. */
    @Column(name = "due_at")
    private LocalDateTime dueAt;

    /** Trạng thái bài kiểm tra đồng nhất với Assignment (DRAFT, ACTIVE, INACTIVE...). */
    @Column(name = "status", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.DRAFT;
}
