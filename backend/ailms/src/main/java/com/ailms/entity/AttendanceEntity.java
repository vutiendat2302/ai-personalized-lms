package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.AttendanceStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin chấm công / điểm danh làm việc của nhân viên và giảng viên.
 */
@Entity
@Table(name = "attendance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AttendanceEntity extends BaseEntity {

    /** Mã định danh bản ghi điểm danh (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Nhân viên được điểm danh. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private EmployeeEntity employee;

    /** Thời điểm điểm danh vào ca làm việc (Check-in). */
    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    /** Thời điểm điểm danh ra ca làm việc (Check-out). */
    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    /** Trạng thái chấm công (PRESENT, ABSENT, LATE, EARLY_LEAVE, ON_LEAVE). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AttendanceStatusEnum status = AttendanceStatusEnum.PRESENT;

    /** Ghi chú chi tiết hoặc lý do đi muộn / về sớm. */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
