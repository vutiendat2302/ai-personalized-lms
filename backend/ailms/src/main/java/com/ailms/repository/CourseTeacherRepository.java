package com.ailms.repository;

import com.ailms.entity.CourseTeacherEntity;
import com.ailms.entity.CourseTeacherId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseTeacherRepository extends JpaRepository<CourseTeacherEntity, CourseTeacherId> {
    List<CourseTeacherEntity> findByCourseEntity_Id(Long courseId);
    List<CourseTeacherEntity> findByUserEntity_Id(Long userId);
}
