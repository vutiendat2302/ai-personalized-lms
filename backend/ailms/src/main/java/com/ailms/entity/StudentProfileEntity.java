package com.ailms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Luu tru thong tin hoc vien
 */
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

//    Ma hoc sinh
    @Column(name = "student_code", nullable = false, unique = true, length = 50)
    private String studentCode;

//    Trinh do hoc van
    @Column(name = "education_level")
    private String educationLevel;

    @Column(name = "description")
    private String description;

//    Muc tieu
    @Column(name = "goal")
    private String goal;

//    Ten truong
    @Column(name = "school_name")
    private String schoolName;

    @OneToMany(mappedBy = "studentProfile", fetch = FetchType.LAZY)
    @Builder.Default
    private List<StudentInterestEntity> studentInterests = new ArrayList<>();
}
