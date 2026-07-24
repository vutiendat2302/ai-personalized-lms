package com.ailms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

/**
 * Base entity chứa các trường audit dùng chung cho mọi entity.
 * Spring Data JPA Auditing sẽ tự động cập nhật:
 * - createdAt : thời điểm tạo bản ghi
 * - createdBy : người tạo
 * - updatedAt : thời điểm cập nhật gần nhất
 * - updatedBy : người cập nhật gần nhất
 * Để hoạt động cần:
 * - @EnableJpaAuditing trong class Application hoặc Config
 * - AuditorAware<Long> để xác định user hiện tại
 */
@Getter
@Setter
@MappedSuperclass
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class) // Tự động xử lý các sự kiện của entity (tự diền các trường base)
@SuperBuilder
public class BaseEntity {

    /** Thời điểm bản ghi được khởi tạo trong hệ thống (Tự động gán bởi JPA Auditing). */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** ID của người dùng khởi tạo bản ghi (Tự động gán bởi JPA Auditing). */
    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private Long createdBy;

    /** Thời điểm bản ghi được cập nhật lần gần nhất (Tự động gán bởi JPA Auditing). */
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** ID của người dùng thực hiện cập nhật bản ghi gần nhất (Tự động gán bởi JPA Auditing). */
    @LastModifiedBy
    @Column(name = "updated_by")
    private Long updatedBy;
}
