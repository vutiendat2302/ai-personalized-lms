package com.ailms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Liên kết học viên với sở thích / lĩnh vực muốn tìm hiểu, phát triển.
 */
@Entity
@Table(name = "student_interest", indexes = {
        @Index(name = "idx_student_interest_student_user_id", columnList = "student_user_id"),
        @Index(name = "idx_student_interest_interest_id", columnList = "interest_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StudentInterestEntity extends BaseEntity {

    @EmbeddedId
    private StudentInterestId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("studentUserId")
    @JoinColumn(name = "student_user_id", nullable = false)
    private StudentProfileEntity studentProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("interestId")
    @JoinColumn(name = "interest_id", nullable = false)
    private InterestEntity interest;

    /**
     * Ghi chú cá nhân về mục tiêu phát triển trong lĩnh vực này.
     */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
