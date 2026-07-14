package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

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
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

//    Kieu hoc
    @Column(name = "goal_type")
    @Enumerated(EnumType.STRING)
    private StudyGoalTypeEnum studyGoalTypeEnum;

//    Muc tieu can dat
    @Column(name = "target_value")
    private Integer targetValue;

    @Column(name = "course_id")
    private Long courseId;

//    So ngay hoc lien tiep hien tai
    @Column(name = "current_streak")
    private Integer currentStreak;

//  Chuoi hoc dai nhat
    @Column(name = "longest_streak")
    private Integer longestStreak;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private StudyGoalSatusEnum goalSatusEnum;
}
