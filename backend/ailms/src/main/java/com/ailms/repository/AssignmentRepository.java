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

    /** Lấy bài tập được giao riêng cho một lớp. */
    List<AssignmentEntity> findByClassIdOrderByDueDateAsc(Long classId);

    /** Lấy bài tập sắp đến hạn của các khóa học đã ghi danh. */
    List<AssignmentEntity> findByCourseIdInAndDueDateBetweenOrderByDueDateAsc(
            List<Long> courseIds, LocalDateTime from, LocalDateTime to);

    /** Lấy deadline assignment chung của các khóa học đang còn quyền truy cập. */
    List<AssignmentEntity> findByStatusAndClassIdIsNullAndCourseIdInAndDueDateBetweenOrderByDueDateAsc(
            com.ailms.entity.enums.BaseStatusEnum status, List<Long> courseIds,
            LocalDateTime from, LocalDateTime to);

    /** Lấy deadline assignment được giao cho các lớp học viên đang tham gia. */
    List<AssignmentEntity> findByStatusAndClassIdInAndDueDateBetweenOrderByDueDateAsc(
            com.ailms.entity.enums.BaseStatusEnum status, List<Long> classIds,
            LocalDateTime from, LocalDateTime to);

    /** Lấy assignment ACTIVE chung theo khóa học mà không quét toàn bộ bảng. */
    List<AssignmentEntity> findByStatusAndClassIdIsNullAndCourseIdInOrderByDueDateAsc(
            com.ailms.entity.enums.BaseStatusEnum status, List<Long> courseIds);

    /** Lấy assignment ACTIVE theo lớp mà không quét toàn bộ bảng. */
    List<AssignmentEntity> findByStatusAndClassIdInOrderByDueDateAsc(
            com.ailms.entity.enums.BaseStatusEnum status, List<Long> classIds);
}
