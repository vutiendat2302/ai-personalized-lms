package com.ailms.repository;

import com.ailms.entity.CourseSectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSectionEntity, Long> {
    int countByCourseEntityId(Long courseId);
}

