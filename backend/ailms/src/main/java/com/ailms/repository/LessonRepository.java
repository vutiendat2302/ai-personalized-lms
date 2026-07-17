package com.ailms.repository;

import com.ailms.entity.LessonEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LessonRepository extends BaseRepository<LessonEntity, Long> {
    
    int countByCourseSectionEntityCourseEntityId(Long courseId);

    int countByCourseSectionEntityId(Long sectionId);

    @Query("SELECT COALESCE(SUM(l.durationMin), 0) FROM LessonEntity l WHERE l.courseSectionEntity.courseEntity.id = :courseId")
    int sumDurationByCourseEntityId(@Param("courseId") Long courseId);


}

