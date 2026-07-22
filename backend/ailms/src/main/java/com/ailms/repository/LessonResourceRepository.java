package com.ailms.repository;

import com.ailms.entity.LessonResourceEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface LessonResourceRepository extends BaseRepository<LessonResourceEntity, Long> {
}
