package com.ailms.repository;

import com.ailms.entity.CourseProgressEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseProgressRepository extends BaseRepository<CourseProgressEntity, Long> {
    List<CourseProgressEntity> findByUserId(Long userId);
    List<CourseProgressEntity> findByCourseId(Long courseId);
    List<CourseProgressEntity> findByEnrollmentId(Long enrollmentId);

    /** Lấy tiến độ của nhiều học viên trong các khóa học người dạy phụ trách. */
    List<CourseProgressEntity> findByUserIdInAndCourseIdIn(List<Long> userIds, List<Long> courseIds);
}
