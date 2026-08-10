package com.ailms.repository;

import com.ailms.entity.AssignmentEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface AssignmentRepository extends BaseRepository<AssignmentEntity, Long> {
    List<AssignmentEntity> findByLessonId(Long lessonId);

    List<AssignmentEntity> findByCourseId(Long courseId);

    List<AssignmentEntity> findBySectionId(Long sectionId);

    /** Lấy bài tập sắp đến hạn của các khóa học đã ghi danh. */
    List<AssignmentEntity> findByCourseIdInAndDueDateBetweenOrderByDueDateAsc(
            List<Long> courseIds, LocalDateTime from, LocalDateTime to);
}
