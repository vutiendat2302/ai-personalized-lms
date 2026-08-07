package com.ailms.repository;

import com.ailms.entity.StudentInterestEntity;
import com.ailms.entity.StudentInterestId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentInterestRepository extends JpaRepository<StudentInterestEntity, StudentInterestId> {

    List<StudentInterestEntity> findByStudentProfile_UserId(Long studentUserId);

    void deleteByStudentProfile_UserId(Long studentUserId);

    List<StudentInterestEntity> findByInterest_Id(Long interestId);

    boolean existsByInterest_Id(Long interestId);

    @org.springframework.data.jpa.repository.Query("SELECT i.name, COUNT(si) FROM StudentInterestEntity si JOIN si.interest i GROUP BY i.name ORDER BY COUNT(si) DESC")
    List<Object[]> countInterestsGroupedByName();
}

