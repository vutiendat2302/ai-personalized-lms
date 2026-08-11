package com.ailms.entity;

import com.ailms.common.snowflake.SnowflakeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/** Ghi nhận người dạy đã bị học viên từ chối để không nhận lại cùng yêu cầu. */
@Entity
@Table(name = "one_on_one_rejected_instructor", uniqueConstraints = {
        @UniqueConstraint(name = "uk_one_on_one_rejected", columnNames = {"request_id", "instructor_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OneOnOneRejectedInstructorEntity extends BaseEntity {

    /** Snowflake ID của bản ghi từ chối. */
    @Id
    @SnowflakeId
    @Column(name = "id", nullable = false, updatable = false)
    private Long id;

    /** Yêu cầu matching liên quan. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private OneOnOneRequestEntity requestEntity;

    /** Người dạy không được nhận lại yêu cầu. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "instructor_id", nullable = false)
    private UserEntity instructorEntity;
}
