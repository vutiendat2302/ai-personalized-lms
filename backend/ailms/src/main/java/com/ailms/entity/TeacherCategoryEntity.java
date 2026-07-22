package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Bảng trung gian liên kết giảng viên với các danh mục/lĩnh vực giảng dạy.
 */
@Entity
@Table(name = "teacher_category", uniqueConstraints = {
        @UniqueConstraint(name = "uk_employee_category", columnNames = {"employee_id", "category_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TeacherCategoryEntity extends BaseEntity {

    /** Mã định danh liên kết chuyên môn (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Nhân sự / Giảng viên được phân công chuyên môn. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    /** Danh mục chuyên môn giảng dạy được gán cho giảng viên. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private CategoryEntity category;

    /** ID người dùng (Admin) thực hiện gán chuyên môn cho giảng viên. */
    @Column(name = "assigned_by")
    private Long assignedBy;

    /** Thời điểm hủy bỏ phân công chuyên môn này (nếu có). */
    @Column(name = "unassigned_at")
    private LocalDateTime unassignedAt;

    /** Trạng thái phân công chuyên môn (ACTIVE, INACTIVE). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;
}
