package com.ailms.repository;

import com.ailms.entity.AssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<AssignmentEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<AssignmentEntity> {
    List<AssignmentEntity> findByLessonId(Long lessonId);
    List<AssignmentEntity> findByCourseId(Long courseId);
    List<AssignmentEntity> findBySectionId(Long sectionId);
}
