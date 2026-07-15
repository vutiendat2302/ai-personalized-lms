package com.ailms.repository;

import com.ailms.entity.LessonResourceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonResourceRepository extends JpaRepository<LessonResourceEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<LessonResourceEntity> {
}
