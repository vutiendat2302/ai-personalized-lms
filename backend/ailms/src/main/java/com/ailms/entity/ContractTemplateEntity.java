package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.entity.enums.ContractTypeEnum;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Thực thể quản lý mẫu hợp đồng HTML cho từng loại hợp đồng.
 */
@Entity
@Table(name = "contract_template")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ContractTemplateEntity extends BaseEntity {

    @Id
    @SnowflakeId
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    /** Tên mẫu hợp đồng (Ví dụ: Mẫu hợp đồng thử việc 2026). */
    @Column(name = "name", nullable = false)
    private String name;

    /** Loại hợp đồng áp dụng (PROBATION, FIXED_TERM, INDEFINITE, SEASONAL). */
    @Column(name = "contract_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private ContractTypeEnum contractTypeEnum;

    /** Nội dung mẫu hợp đồng định dạng HTML chứa các placeholder {{variableName}}. */
    @Column(name = "template_content", columnDefinition = "TEXT", nullable = false)
    private String templateContent;

    /** Phiên bản mẫu hợp đồng (Ví dụ: 1, 2). */
    @Column(name = "version")
    @Builder.Default
    private Integer version = 1;

    /** Trạng thái mẫu hợp đồng (ACTIVE, INACTIVE). */
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BaseStatusEnum status = BaseStatusEnum.ACTIVE;
}
