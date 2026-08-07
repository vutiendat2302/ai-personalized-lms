package com.ailms.repository;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseTeacherEntity;
import com.ailms.entity.CourseTeacherId;
import com.ailms.entity.enums.CourseTeacherStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseTeacherRepository extends JpaRepository<CourseTeacherEntity, CourseTeacherId>, JpaSpecificationExecutor<CourseTeacherEntity> {
    List<CourseTeacherEntity> findByCourseEntity_Id(Long courseId);
    List<CourseTeacherEntity> findByCourseEntity_IdAndStatus(Long courseId, CourseTeacherStatusEnum status);
    List<CourseTeacherEntity> findByUserEntity_Id(Long userId);
    List<CourseTeacherEntity> findByUserEntity_IdAndStatus(Long userId, CourseTeacherStatusEnum status);
}
