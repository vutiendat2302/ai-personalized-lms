package com.ailms.repository;

import com.ailms.entity.AssignmentEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentRepository extends BaseRepository<AssignmentEntity, Long> {
    List<AssignmentEntity> findByLessonId(Long lessonId);

    List<AssignmentEntity> findByCourseId(Long courseId);

    List<AssignmentEntity> findBySectionId(Long sectionId);
}
