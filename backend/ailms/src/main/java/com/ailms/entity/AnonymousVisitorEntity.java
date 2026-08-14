package com.ailms.entity;

import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/** Danh tính ẩn danh của khách landing page, chỉ lưu hash token. */
@Entity
@Table(name = "anonymous_visitor", indexes = {
        @Index(name = "idx_anonymous_visitor_token_hash", columnList = "visitor_token_hash", unique = true)
})
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class AnonymousVisitorEntity extends BaseEntity {
    /** ID Snowflake của visitor, dùng chung convention định danh toàn hệ thống. */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Hash SHA-256 của token truy cập, không lưu token gốc. */
    @Column(name = "visitor_token_hash", nullable = false, unique = true, length = 64)
    private String visitorTokenHash;

    /** Thời điểm visitor lần đầu mở widget. */
    @Column(name = "first_seen_at", nullable = false)
    private LocalDateTime firstSeenAt;

    /** Thời điểm visitor hoạt động gần nhất. */
    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    /** Trạng thái vòng đời visitor. */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;
}
