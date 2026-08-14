package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.SupportConversationStatusEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/** Phiên guided chat hoặc trò chuyện trực tiếp giữa visitor và HR. */
@Entity
@Table(name = "support_conversation", indexes = {
        @Index(name = "idx_support_conversation_visitor_status", columnList = "visitor_id,status"),
        @Index(name = "idx_support_conversation_queue", columnList = "status,created_at"),
        @Index(name = "idx_support_conversation_hr_status", columnList = "assigned_hr_id,status"),
        @Index(name = "idx_support_conversation_response_timeout", columnList = "status,last_hr_message_at")
})
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class SupportConversationEntity extends BaseEntity {
    /** ID Snowflake của phiên tư vấn. */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Visitor sở hữu phiên, dùng để chống truy cập chéo. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visitor_id", nullable = false)
    private AnonymousVisitorEntity visitor;

    /** HR duy nhất được phân công, null khi còn trong queue. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_hr_id")
    private UserEntity assignedHr;

    /** State machine của cuộc trò chuyện. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private SupportConversationStatusEnum status = SupportConversationStatusEnum.GUIDED;

    /** Tên visitor dùng làm định danh chính trên hàng đợi supporter. */
    @Column(name = "full_name", length = 120)
    private String fullName;

    /** Số điện thoại tùy chọn, không đưa vào response/card supporter. */
    @Column(name = "phone", length = 30)
    private String phone;

    /** Email visitor đã cung cấp. */
    @Column(name = "email", length = 255)
    private String email;

    /** Ngữ cảnh guided đã chọn, chỉ chứa option/value đã kiểm soát. */
    @Column(name = "guided_context", columnDefinition = "JSON")
    private String guidedContext;

    /** Vị trí FIFO được tính lại khi lấy queue. */
    @Column(name = "queue_position")
    private Integer queuePosition;

    /** Thời gian chờ ước tính theo vị trí queue và số supporter online. */
    @Column(name = "estimated_wait_minutes")
    private Integer estimatedWaitMinutes;

    /** Lý do đóng hoặc hết hạn. */
    @Column(name = "close_reason", length = 100)
    private String closeReason;

    /** Thời điểm HR bắt đầu xử lý. */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** Thời điểm gần nhất supporter gửi nội dung cần visitor phản hồi. */
    @Column(name = "last_hr_message_at")
    private LocalDateTime lastHrMessageAt;

    /** Thời điểm gần nhất visitor phản hồi trong phiên trực tiếp. */
    @Column(name = "last_visitor_message_at")
    private LocalDateTime lastVisitorMessageAt;

    /** Thời điểm supporter đã gửi yêu cầu đóng sau ít nhất 5 phút chờ. */
    @Column(name = "close_requested_at")
    private LocalDateTime closeRequestedAt;

    /** Thời điểm kết thúc phiên. */
    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    /** Version bảo vệ chuyển trạng thái đồng thời. */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
