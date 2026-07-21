package com.ailms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/**
 * Khóa phức hợp (Composite Key) cho thực thể liên kết StudentInterestEntity.
 * Bao gồm ID học viên và ID sở thích.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class StudentInterestId implements Serializable {

    /** Mã ID của người dùng / học viên. */
    @Column(name = "student_user_id")
    private Long studentUserId;

    /** Mã ID của danh mục sở thích. */
    @Column(name = "interest_id")
    private Long interestId;
}
