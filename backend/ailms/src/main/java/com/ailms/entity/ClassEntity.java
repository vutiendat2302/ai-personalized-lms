package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;


/**
 * Lưu trữ thông tin lớp học của khóa học, bao gồm hình thức đào tạo,
 * sức chứa, số lượng học viên hiện tại, thời gian diễn ra và trạng thái lớp.
 */
@Entity
@Table(name = "class", indexes = {
        @Index(name = "idx_class_course_id", columnList = "course_id"),
        @Index(name = "idx_class_category_id", columnList = "category_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ClassEntity extends BaseEntity {

    /** Mã định danh lớp học (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Khóa học tương ứng của lớp học. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private CourseEntity courseEntity;

    /** Danh mục chuyên môn liên quan. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private CategoryEntity categoryEntity;

    /** Tên lớp học (VD: Lớp Java K01, Lớp Tiếng Anh Giao Tiếp T2-4-6). */
    @Column(name = "name")
    private String name;

    /** Hình thức đào tạo lớp học (ONE_ON_ONE, GROUP_CLASS, HYBRID). */
    @Column(name = "package_type")
    @Enumerated(EnumType.STRING)
    private DeliveryModeEnum packageType; // ONE_ON_ONE, GROUP_CLASS, Hình thức đào tạo

    /** Phân loại kỹ thuật lớp học. */
    @Column(name = "type")
    private Byte type; // Loại lớp học

    /** Sức chứa / số lượng thành viên tối đa trong lớp học. */
    @Column(name = "max_members")
    private Integer maxMembers = 0;

    /** Số lượng học viên hiện tại đã đăng ký tham gia lớp. */
    @Column(name = "current_member_count")
    @Builder.Default
    private Integer currentMemberCount = 0;

    /** Trạng thái hoạt động của lớp học (ACTIVE, INACTIVE, UPCOMING, COMPLETED, CANCELLED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;

    /** Ngày thời điểm khai giảng lớp học. */
    @Column(name = "start_date")
    private LocalDateTime startDate;

    /** Ngày thời điểm dự kiến bế giảng/kết thúc lớp học. */
    @Column(name = "end_date")
    private LocalDateTime endDate;
}
