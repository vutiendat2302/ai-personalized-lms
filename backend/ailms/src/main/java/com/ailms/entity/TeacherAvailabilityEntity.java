package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalTime;

/**
 * Thực thể lưu trữ khung thời gian rảnh / sẵn sàng giảng dạy của giảng viên (dùng xếp lịch lớp 1-1 hoặc lớp nhóm).
 */
@Entity
@Table(name = "teacher_availability", indexes = {
        @Index(name = "idx_teacher_avail_employee_id", columnList = "employee_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TeacherAvailabilityEntity extends BaseEntity {

    /** Mã định danh lịch rảnh (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Giảng viên đăng ký lịch rảnh. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employeeEntity;

    /** Ngày trong tuần sẵn sàng dạy (1 = Thứ Hai, 2 = Thứ Ba, ..., 7 = Chủ Nhật). */
    @Column(name = "day_of_week", nullable = false)
    private Integer dayOfWeek; // 1 = Monday, ..., 7 = Sunday

    /** Giờ bắt đầu khung thời gian rảnh. */
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    /** Giờ kết thúc khung thời gian rảnh. */
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    /** Trạng thái khung thời gian rảnh (ACTIVE, INACTIVE, BOOKED). */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private BaseStatusEnum status;
}
