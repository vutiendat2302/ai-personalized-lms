package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.LeaveStatusEnum;
import com.ailms.entity.enums.LeaveTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Lưu trữ thông tin đơn nghỉ phép của nhân viên.
 */
@Entity
@Table(name = "leave_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LeaveRequestEntity extends BaseEntity {

    /** Mã định danh đơn nghỉ phép (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Nhân viên tạo đơn xin nghỉ phép. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    /** Loại nghỉ phép (ANNUAL, SICK, UNPAID, MATERNITY, OTHER). */
    @Column(name = "leave_type", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LeaveTypeEnum leaveType = LeaveTypeEnum.ANNUAL;

    /** Ngày bắt đầu nghỉ phép. */
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** Ngày kết thúc nghỉ phép. */
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** Lý do xin nghỉ phép. */
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    /** Trạng thái duyệt đơn nghỉ phép (PENDING, APPROVED, REJECTED, CANCELLED). */
    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private LeaveStatusEnum status = LeaveStatusEnum.PENDING;

    /** Người duyệt đơn xin nghỉ phép (Quản lý / Admin). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id")
    private UserEntity approver;

    /** Thời điểm duyệt hoặc từ chối đơn nghỉ phép. */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /** Lý do từ chối đơn nghỉ phép (nếu bị từ chối). */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;
}
