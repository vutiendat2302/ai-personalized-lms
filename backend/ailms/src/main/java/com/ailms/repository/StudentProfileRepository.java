package com.ailms.repository;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentProfileRepository extends BaseRepository<StudentProfileEntity, Long> {
    Optional<StudentProfileEntity> findByStudentCode(String studentCode);
    boolean existsByStudentCode(String studentCode);

    @Query("SELECT COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = :status")
    long countStudentsByStatus(@Param("status") UserStatusEnum status);

    @Query("SELECT COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = :status AND s.createdAt >= :firstDayOfMonth")
    long countNewStudentsSince(@Param("status") UserStatusEnum status,
                               @Param("firstDayOfMonth") LocalDateTime firstDayOfMonth);

    @Query("SELECT COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = :status AND s.isMinor = true AND NOT EXISTS (SELECT g FROM GuardianEntity g WHERE g.studentProfile.userId = s.userId)")
    long countMinorWithoutGuardian(@Param("status") UserStatusEnum status);

    @Query("SELECT COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = :status AND s.isMinor = true AND NOT EXISTS (SELECT e FROM EnrollmentEntity e WHERE e.userEntity.id = s.userId)")
    long countMinorWithoutEnrollment(@Param("status") UserStatusEnum status);

    @Query("SELECT s.hasGoal, COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status = :status GROUP BY s.hasGoal")
    List<Object[]> countOnboardingStatus(@Param("status") UserStatusEnum status);

    @Query("SELECT s.userEntity.gender, COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status <> :excludedStatus GROUP BY s.userEntity.gender")
    List<Object[]> countByGenderExcluding(@Param("excludedStatus") UserStatusEnum excludedStatus);

    @Query("SELECT s.userEntity.status, COUNT(s) FROM StudentProfileEntity s WHERE s.userEntity.status <> :excludedStatus GROUP BY s.userEntity.status")
    List<Object[]> countByUserStatusExcluding(@Param("excludedStatus") UserStatusEnum excludedStatus);

    @Query("SELECT MONTH(s.createdAt), COUNT(s) FROM StudentProfileEntity s WHERE YEAR(s.createdAt) = :year GROUP BY MONTH(s.createdAt) ORDER BY MONTH(s.createdAt)")
    List<Object[]> countMonthlyNewStudents(@Param("year") int year);
}
