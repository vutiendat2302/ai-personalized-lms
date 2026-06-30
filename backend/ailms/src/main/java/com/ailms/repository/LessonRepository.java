package com.ailms.repository;

import com.ailms.entity.LessonEntity;
import org.springframework.data.jpa.repository.JpaRepository;

interface LessonRepository extends JpaRepository<LessonEntity, Long> {
}
