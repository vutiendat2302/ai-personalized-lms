package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.StudyGoalStatusEnum;
import com.ailms.entity.enums.StudyGoalTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Thực thể theo dõi mục tiêu học tập cá nhân của học viên (VD: số giờ học, số bài học hoàn thành, streak ngày học).
 */
@Entity
@Table(name = "study_goal", indexes = {
        @Index(name = "idx_study_goal_user_id", columnList = "user_id"),
        @Index(name = "idx_study_goal_course_id", columnList = "course_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StudyGoalEntity extends BaseEntity {

    /** Mã định danh mục tiêu học tập (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** ID người dùng / học viên sở hữu mục tiêu này. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Loại mục tiêu học tập (VD: DAILY_TIME, WEEKLY_LESSONS, COURSE_COMPLETION). */
    @Column(name = "goal_type")
    @Enumerated(EnumType.STRING)
    private StudyGoalTypeEnum studyGoalTypeEnum;

    /** Giá trị mục tiêu cần đạt (VD: 30 phút/ngày, 5 bài/tuần). */
    @Column(name = "target_value")
    private Integer targetValue;

    /** ID khóa học liên quan (null nếu là mục tiêu chung toàn hệ thống). */
    @Column(name = "course_id")
    private Long courseId;

    /** Số ngày học liên tiếp hiện tại (Streak hiện tại). */
    @Column(name = "current_streak")
    private Integer currentStreak;

    /** Chuỗi số ngày học liên tiếp dài nhất từng đạt được. */
    @Column(name = "longest_streak")
    private Integer longestStreak;

    /** Trạng thái mục tiêu (IN_PROGRESS, COMPLETED, FAILED, CANCELLED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StudyGoalStatusEnum status = StudyGoalStatusEnum.IN_PROGRESS;
}
