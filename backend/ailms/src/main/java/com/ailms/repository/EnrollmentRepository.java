package com.ailms.repository;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends BaseRepository<EnrollmentEntity, Long> {
    List<EnrollmentEntity> findByUserEntity_Id(Long userId);
    List<EnrollmentEntity> findByCourseEntity_Id(Long courseId);
    List<EnrollmentEntity> findByClassEntity_Id(Long classId);
    long countByCourseEntity_Id(Long courseId);
    java.util.Optional<EnrollmentEntity> findByUserEntity_IdAndCourseEntity_Id(Long userId, Long courseId);

    /** Khóa enrollment hiện có để tái sử dụng an toàn khi IPN bị gửi đồng thời. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("""
        SELECT e FROM EnrollmentEntity e
        WHERE e.userEntity.id = :userId AND e.courseEntity.id = :courseId
        """)
    Optional<EnrollmentEntity> findForUpdateByUserAndCourse(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("courseId") Long courseId);
}
