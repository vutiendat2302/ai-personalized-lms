package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalTime;

/**
 * Lưu trữ lịch học định kỳ của lớp học, bao gồm ngày trong tuần,
 * khung giờ học và trạng thái áp dụng của lịch học.
 */
@Entity
@Table(name = "class_schedule", indexes = {
        @Index(name = "idx_class_sched_class_id", columnList = "class_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ClassScheduleEntity extends BaseEntity {

    /** Mã định danh lịch học định kỳ (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Lớp học áp dụng lịch học định kỳ này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    /** Ngày trong tuần áp dụng lịch (1 = Thứ Hai, 2 = Thứ Ba, ..., 7 = Chủ Nhật). */
    @Column(name = "day_of_week")
    private Integer dayOfWeek; // 1 = Monday, ..., 7 = Sunday

    /** Giờ bắt đầu buổi học (VD: 18:30:00). */
    @Column(name = "start_time")
    private LocalTime startTime;

    /** Giờ kết thúc buổi học (VD: 20:30:00). */
    @Column(name = "end_time")
    private LocalTime endTime;

    /** Trạng thái lịch học (ACTIVE, INACTIVE). */
    @Column(name = "status", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;
}
