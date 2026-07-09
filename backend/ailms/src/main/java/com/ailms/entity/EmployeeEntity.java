package com.ailms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

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

    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "position", length = 100)
    private String position;

    @Column(name = "employment_type")
    @Enumerated(EnumType.ORDINAL)
    private EmploymentType employmentType;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "status")
    @Enumerated(EnumType.ORDINAL)
    private EmployeeStatus status;
}
