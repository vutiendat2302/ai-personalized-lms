package com.ailms.repository;

import com.ailms.entity.LessonResourceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

interface LessonResourceRepository extends JpaRepository<LessonResourceEntity, Long> {
}
