package com.ailms.repository;

import com.ailms.entity.QuizEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;
import com.ailms.entity.enums.BaseStatusEnum;

@Repository
public interface QuizRepository extends BaseRepository<QuizEntity, Long> {
    /** Kiểm tra mã quiz tự sinh đã tồn tại hay chưa. */
    boolean existsByCode(String code);

    List<QuizEntity> findByLessonId(Long lessonId);

    List<QuizEntity> findByCourseId(Long courseId);

    List<QuizEntity> findBySectionId(Long sectionId);

    /** Lấy quiz/bài thi do đúng người dùng hiện tại tạo. */
    List<QuizEntity> findByCreatedByOrderByCreatedAtDesc(Long createdBy);

    /** Lấy quiz thuộc các lớp hoặc khóa học người dạy đang phụ trách. */
    List<QuizEntity> findByClassIdInOrCourseIdInOrderByDueAtAsc(List<Long> classIds, List<Long> courseIds);

    /** Lấy quiz/bài thi được giao riêng cho một lớp. */
    List<QuizEntity> findByClassIdOrderByDueAtAsc(Long classId);

    /** Lấy deadline quiz chung của các khóa học đang còn quyền truy cập. */
    List<QuizEntity> findByStatusAndClassIdIsNullAndCourseIdInAndDueAtBetweenOrderByDueAtAsc(
            BaseStatusEnum status, List<Long> courseIds, LocalDateTime from, LocalDateTime to);

    /** Lấy deadline quiz được giao cho các lớp học viên đang tham gia. */
    List<QuizEntity> findByStatusAndClassIdInAndDueAtBetweenOrderByDueAtAsc(
            BaseStatusEnum status, List<Long> classIds, LocalDateTime from, LocalDateTime to);

    /** Lấy quiz ACTIVE chung theo khóa học mà không quét toàn bộ bảng. */
    List<QuizEntity> findByStatusAndClassIdIsNullAndCourseIdInOrderByDueAtAsc(
            BaseStatusEnum status, List<Long> courseIds);

    /** Lấy quiz ACTIVE theo lớp mà không quét toàn bộ bảng. */
    List<QuizEntity> findByStatusAndClassIdInOrderByDueAtAsc(
            BaseStatusEnum status, List<Long> classIds);
}
