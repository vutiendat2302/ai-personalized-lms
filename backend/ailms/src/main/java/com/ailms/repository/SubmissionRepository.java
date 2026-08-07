package com.ailms.repository;

import com.ailms.entity.SubmissionEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface SubmissionRepository extends BaseRepository<SubmissionEntity, Long> {
    List<SubmissionEntity> findByAssignmentId(Long assignmentId);
    List<SubmissionEntity> findByUserId(Long userId);
    List<SubmissionEntity> findByEnrollmentId(Long enrollmentId);
    Optional<SubmissionEntity> findByAssignmentIdAndUserId(Long assignmentId, Long userId);
    List<SubmissionEntity> findByAssignmentIdOrderBySubmittedAtDesc(Long assignmentId);
}
