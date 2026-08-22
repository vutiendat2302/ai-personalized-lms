package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.AttendanceSourceEnum;
import com.ailms.entity.enums.AttendanceStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin chấm công / điểm danh làm việc hàng ngày của nhân viên.
 */
@Entity
@Table(name = "attendance", uniqueConstraints = {
    @UniqueConstraint(name = "uq_attendance_employee_date", columnNames = {"employee_id", "work_date"})
})
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
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    /** Ngày chấm công (tách riêng khỏi checkInTime để query/group theo ngày). */
    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    /** Ca làm việc được phân công cho ngày này. Nullable nếu không có ca cố định. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_shift_id")
    private WorkShiftEntity workShift;

    /** Thời điểm điểm danh vào ca làm việc (Check-in). */
    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    /** Thời điểm điểm danh ra ca làm việc (Check-out). */
    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    /** Trạng thái chấm công (PRESENT, LATE, ABSENT, ON_LEAVE, HALF_DAY...). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AttendanceStatusEnum status = AttendanceStatusEnum.PRESENT;

    /** Tổng số phút làm việc thực tế (tính từ checkIn -> checkOut). */
    @Column(name = "worked_minutes")
    private Integer workedMinutes;

    /** Số phút đi muộn so với giờ bắt đầu ca. 0 nếu đúng giờ hoặc sớm hơn. */
    @Column(name = "late_minutes")
    @Builder.Default
    private Integer lateMinutes = 0;

    /** Số phút về sớm so với giờ kết thúc ca. */
    @Column(name = "early_leave_minutes")
    @Builder.Default
    private Integer earlyLeaveMinutes = 0;

    /** Số phút làm thêm ngoài ca quy định. */
    @Column(name = "overtime_minutes")
    @Builder.Default
    private Integer overtimeMinutes = 0;

    /** Nguồn dữ liệu điểm danh (DEVICE, MANUAL, SIMULATED). */
    @Column(name = "source")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AttendanceSourceEnum source = AttendanceSourceEnum.DEVICE;

    /** ID người phê duyệt chỉnh sửa tay (HR/Admin). */
    @Column(name = "approved_by")
    private Long approvedBy;

    /** Thời điểm phê duyệt chỉnh sửa tay. */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /** Ghi chú chi tiết hoặc lý do đi muộn / về sớm. */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
