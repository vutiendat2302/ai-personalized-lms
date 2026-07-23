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

    boolean existsByCourseIdAndUserId(Long courseId, Long userId);

    List<ReviewEntity> findByCourseIdAndStatus(Long courseId, ReviewStatusEnum status);

    @Query("SELECT r FROM ReviewEntity r LEFT JOIN FETCH r.courseEntity LEFT JOIN FETCH r.userEntity WHERE r.courseId = :courseId AND r.status = :status")
    List<ReviewEntity> findByCourseIdAndStatusWithRelations(@Param("courseId") Long courseId, @Param("status") ReviewStatusEnum status);

    @Query("SELECT AVG(r.rating) FROM ReviewEntity r WHERE r.courseId = :courseId AND r.status = 'APPROVED'")
    Double getAverageRatingForCourse(@Param("courseId") Long courseId);

    @Query("SELECT COUNT(r) FROM ReviewEntity r WHERE r.courseId = :courseId AND r.status = 'APPROVED'")
    Long getReviewCountForCourse(@Param("courseId") Long courseId);
}
