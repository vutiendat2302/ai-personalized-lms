package com.ailms.repository;

import com.ailms.entity.SubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<SubmissionEntity, Long> {
    List<SubmissionEntity> findByAssignmentId(Long assignmentId);
    List<SubmissionEntity> findByUserId(Long userId);
    List<SubmissionEntity> findByEnrollmentId(Long enrollmentId);
}
