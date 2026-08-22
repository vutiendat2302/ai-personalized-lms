package com.ailms.repository;

import com.ailms.entity.LessonResourceEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface LessonResourceRepository extends BaseRepository<LessonResourceEntity, Long> {
    /** Tìm danh sách tài nguyên đính kèm theo mã bài học. */
    List<LessonResourceEntity> findByLessonEntity_Id(Long lessonId);
}
