package com.ailms.repository;

import com.ailms.entity.ReviewEntity;
import com.ailms.entity.enums.ReviewStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<ReviewEntity, Long>, JpaSpecificationExecutor<ReviewEntity> {

    Optional<ReviewEntity> findByCourseIdAndUserId(Long courseId, Long userId);

    /** Lấy đánh giá của một học viên theo danh sách khóa học để dựng thẻ khóa học theo batch. */
    List<ReviewEntity> findByCourseIdInAndUserId(List<Long> courseIds, Long userId);

    boolean existsByCourseIdAndUserId(Long courseId, Long userId);

    List<ReviewEntity> findByCourseIdAndStatus(Long courseId, ReviewStatusEnum status);

    @Query("SELECT r FROM ReviewEntity r LEFT JOIN FETCH r.courseEntity LEFT JOIN FETCH r.userEntity WHERE r.courseId = :courseId AND r.status = :status")
    List<ReviewEntity> findByCourseIdAndStatusWithRelations(@Param("courseId") Long courseId, @Param("status") ReviewStatusEnum status);

    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.courseId = :courseId AND r.status = 'ACTIVE'")
    Double getAverageRatingForCourse(@Param("courseId") Long courseId);

    @Query("SELECT COUNT(r) FROM ReviewEntity r WHERE r.courseId = :courseId AND r.status = 'ACTIVE'")
    Long getReviewCountForCourse(@Param("courseId") Long courseId);

    /** Đếm các đánh giá tích cực từ bốn sao trở lên của một khóa học. */
    long countByCourseIdAndStatusAndRatingGreaterThanEqual(Long courseId, ReviewStatusEnum status, Integer rating);

    /** Đếm toàn bộ đánh giá đang hiển thị của một khóa học. */
    long countByCourseIdAndStatus(Long courseId, ReviewStatusEnum status);

    /** Tính điểm trung bình theo trạng thái đánh giá của khóa học. */
    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.courseId = :courseId AND r.status = :status")
    Double getAverageRatingForCourseAndStatus(@Param("courseId") Long courseId,
                                               @Param("status") ReviewStatusEnum status);

    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.status = 'ACTIVE'")
    Double getAverageRatingOfActiveReviews();

    /** Tính rating trung bình cho toàn bộ khóa học người dạy đang phụ trách. */
    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.courseId IN :courseIds AND r.status = :status")
    Double getAverageRatingByCourseIdsAndStatus(@Param("courseIds") List<Long> courseIds,
                                                 @Param("status") ReviewStatusEnum status);
}
