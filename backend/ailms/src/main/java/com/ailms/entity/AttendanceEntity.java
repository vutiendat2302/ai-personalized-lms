package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.AttendanceStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Luu tru thong tin cham cong cua nhan vien fulltime
 */
@Entity
@Table(name = "attendance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AttendanceEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

//    Nhan vien duoc cham cong
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

//    Thoi gian check in
    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

//    Thoi gian check out
    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

//    Trang thai cham cong cua nhan vien
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AttendanceStatusEnum status = AttendanceStatusEnum.PRESENT;

//    Note
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
