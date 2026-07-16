package com.ailms.entity;

import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Lưu trữ thông tin nhân sự của người dùng trong hệ thống.
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

    /** * Khóa chính của bảng employee. * Đồng thời là khóa ngoại tham chiếu đến UserEntity. */
    @Id
    @Column(name = "user_id")
    private Long userId;

    /** * Thông tin tài khoản người dùng tương ứng với nhân viên. * Sử dụng Shared Primary Key với cột user_id. */
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    /** * Mã nhân viên duy nhất trong hệ thống. */
    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;

    /** * Phòng ban mà nhân viên trực thuộc. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private DepartmentEntity department;

    /** * Chức vụ của nhân viên. */
    @Column(name = "position", length = 100)
    private String position;

    /** * Loại hình làm việc của nhân viên * (Full-time, Part-time, Contract, Internship,...). */
    @Column(name = "employment_type")
    @Enumerated(EnumType.STRING)
    private EmploymentTypeEnum employmentTypeEnum;

    /** * Ngày bắt đầu làm việc. */
    @Column(name = "start_date")
    private LocalDateTime startDate;

    /** * Ngày kết thúc làm việc (nếu có). */
    @Column(name = "end_date")
    private LocalDateTime endDate;

    /** * Trạng thái hiện tại của nhân viên. */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EmployeeStatusEnum status = EmployeeStatusEnum.ACTIVE;

    @Transient
    public Long getId() {
        return userId;
    }
}
