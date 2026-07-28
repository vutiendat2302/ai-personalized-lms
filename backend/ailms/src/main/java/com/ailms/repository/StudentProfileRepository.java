package com.ailms.repository;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentProfileRepository extends BaseRepository<StudentProfileEntity, Long> {
    Optional<StudentProfileEntity> findByStudentCode(String studentCode);
    boolean existsByStudentCode(String studentCode);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = com.ailms.entity.enums.UserStatusEnum.ACTIVE")
    long countActiveStudents();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = com.ailms.entity.enums.UserStatusEnum.ACTIVE AND s.createdAt >= :firstDayOfMonth")
    long countNewStudentsThisMonth(@org.springframework.data.repository.query.Param("firstDayOfMonth") java.time.LocalDateTime firstDayOfMonth);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = com.ailms.entity.enums.UserStatusEnum.ACTIVE AND s.isMinor = true AND NOT EXISTS (SELECT g FROM GuardianEntity g WHERE g.studentProfile.userId = s.userId)")
    long countMinorWithoutGuardian();

    @org.springframework.data.jpa.repository.Query("SELECT s.hasGoal, COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = com.ailms.entity.enums.UserStatusEnum.ACTIVE GROUP BY s.hasGoal")
    java.util.List<Object[]> countOnboardingStatus();
}


