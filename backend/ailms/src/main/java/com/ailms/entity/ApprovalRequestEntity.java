package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.ApprovalStatusEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * Thực thể lưu trữ thông tin yêu cầu phê duyệt cho các quy trình nghiệp vụ (Hợp đồng, Bảng lương, Đổi lớp, Đổi giảng viên, Duyệt khóa học...).
 */
@Entity
@Table(name = "approval_request")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ApprovalRequestEntity extends BaseEntity {

    /** Mã định danh yêu cầu phê duyệt (Snowflake ID 64-bit). */
    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Loại đối tượng nghiệp vụ cần phê duyệt (VD: CONTRACT, SALARY, SESSION_PAYMENT, COURSE). */
    @Column(name = "target_type")
    private String targetType; // e.g. "CONTRACT", "SALARY", "TEACHING_PAYMENT"

    /** ID của đối tượng nghiệp vụ cụ thể cần phê duyệt. */
    @Column(name = "target_id")
    private Long targetId; // id cua phien ban can phe duyet

    /** Cấp phê duyệt hiện tại trong quy trình (1, 2, 3...). */
    @Column(name = "level")
    @Builder.Default
    private int level = 1;

    /** Tổng số cấp phê duyệt cần trải qua. */
    @Column(name = "total_levels")
    @Builder.Default
    private int totalLevels = 1;

    /** ID người dùng (Quản lý / Admin) có thẩm quyền xử lý phê duyệt yêu cầu này. */
    @Column(name = "approver_id")
    private Long approverId; // id nguoi co quyen xu ly request nay

    /** Trạng thái yêu cầu phê duyệt (PENDING, APPROVED, REJECTED, CANCELLED). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ApprovalStatusEnum status = ApprovalStatusEnum.PENDING;

    /** Nhận xét hoặc lý do đồng ý / từ chối của người phê duyệt. */
    @Column(name = "comment")
    private String comment;

    /** Thời điểm người phê duyệt đưa ra quyết định xử lý. */
    @Column(name = "decided_at")
    private LocalDateTime decidedAt;
}
