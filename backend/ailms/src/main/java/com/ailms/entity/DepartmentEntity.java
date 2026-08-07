package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Thực thể quản lý các phòng ban trong tổ chức / trung tâm.
 */
@Entity
@Table(name = "department", uniqueConstraints = {
        @UniqueConstraint(name = "uk_department_code", columnNames = {"code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DepartmentEntity extends BaseEntity {

    /** Mã định danh phòng ban (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Mã phòng ban duy nhất trong hệ thống (VD: HR, IT, ACADEMIC, MARKETING). */
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    /** Tên hiển thị đầy đủ của phòng ban. */
    @Column(name = "name", nullable = false, length = 255)

    private String name;

    /** Mô tả chi tiết về chức năng và nhiệm vụ của phòng ban. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * Trạng thái hoạt động (ACTIVE, INACTIVE).
     */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Danh sách các nhân viên thuộc phòng ban này. */
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    @Builder.Default
    private List<EmployeeEntity> employees = new ArrayList<>();

    @Transient // Ko luu trong db, chi chua du lieu tra ve
    private Long employeeCount;
}
