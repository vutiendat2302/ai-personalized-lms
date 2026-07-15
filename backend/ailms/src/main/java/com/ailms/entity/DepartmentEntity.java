package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

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

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** * Mã phòng ban duy nhất trong hệ thống. */
    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    /** * Tên phòng ban. */
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /** * Mô tả chi tiết về phòng ban. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /**
     * 1 = Active, 0 = Inactive
     */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** * Danh sách nhân viên thuộc phòng ban. */
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    @Builder.Default
    private List<EmployeeEntity> employees = new ArrayList<>();
}
