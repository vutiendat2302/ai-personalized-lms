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

    /** * Phòng ban cha của phòng ban hiện tại. * Null nếu là phòng ban cấp cao nhất. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private DepartmentEntity parent;

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
    private BaseStatusEnum status;

    /** * Danh sách các phòng ban con trực thuộc. */
    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    @Builder.Default
    private List<DepartmentEntity> children = new ArrayList<>();

    /** * Danh sách nhân viên thuộc phòng ban. */
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    @Builder.Default
    private List<EmployeeEntity> employees = new ArrayList<>();
}
