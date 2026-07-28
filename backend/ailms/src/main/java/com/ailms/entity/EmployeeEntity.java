package com.ailms.entity;

import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Lưu trữ thông tin nhân sự và giảng viên trong hệ thống LMS.
 * Khóa chính `userId` liên kết 1-1 với tài khoản người dùng (`UserEntity`).
 */
@Entity
@Table(name = "employee", uniqueConstraints = {
        @UniqueConstraint(name = "uk_employee_code", columnNames = {"employee_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeeEntity extends BaseEntity {

    /**
     * Khóa chính của bảng employee (trùng với ID của UserEntity).
     */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /**
     * Thông tin tài khoản người dùng tương ứng với nhân viên.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /**
     * Mã nhân viên duy nhất trong hệ thống.
     */
    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;

    /**
     * Phòng ban mà nhân viên trực thuộc.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private DepartmentEntity department;

    /**
     * Chức vụ của nhân viên (VD: Giảng viên, Nhân viên tuyển sinh, Trưởng phòng).
     */
    @Column(name = "position", length = 100)
    private String position;

    /**
     * Loại hình làm việc (FULL_TIME, PART_TIME, CONTRACT, INTERN).
     */
    @Column(name = "employment_type")
    @Enumerated(EnumType.STRING)
    private EmploymentTypeEnum employmentTypeEnum;

    /**
     * Ngày bắt đầu làm việc chính thức.
     */
    @Column(name = "start_date")
    private LocalDateTime startDate;

    /**
     * Ngày kết thúc hợp đồng hoặc nghỉ việc (null nếu đang làm việc).
     */
    @Column(name = "end_date")
    private LocalDateTime endDate;

    /**
     * Dia chi cua nhan vien
     */
    @Column(name = "address")
    private String address;

    /**
     * Trạng thái nhân sự (ACTIVE, PROBATION, SUSPENDED, TERMINATED).
     */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EmployeeStatusEnum status = EmployeeStatusEnum.ACTIVE;

}
