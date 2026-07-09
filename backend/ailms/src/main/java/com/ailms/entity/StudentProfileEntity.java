package com.ailms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "student_profile", uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_code", columnNames = {"student_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StudentProfileEntity extends BaseEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity userEntity;

    @Column(name = "student_code", nullable = false, unique = true, length = 50)
    private String studentCode;

    @Column(name = "education_level")
    private String educationLevel;

    @Column(name = "description")
    private String description;

    @Column(name = "goal")
    private String goal;

    @Column(name = "school_name")
    private String schoolName;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_minor")
    private Boolean isMinor;
}
