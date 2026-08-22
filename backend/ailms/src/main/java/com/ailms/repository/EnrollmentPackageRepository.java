package com.ailms.repository;

import com.ailms.entity.EnrollmentPackageEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentPackageRepository extends BaseRepository<EnrollmentPackageEntity, Long> {
    List<EnrollmentPackageEntity> findByEnrollmentEntity_Id(Long enrollmentId);
    List<EnrollmentPackageEntity> findByEnrollmentEntity_IdAndExpiresAtAfter(Long enrollmentId, LocalDateTime now);
    List<EnrollmentPackageEntity> findByExpiresAtBefore(LocalDateTime now);

    /** Lấy ID các khóa học mà người dùng còn ít nhất một gói ACTIVE chưa hết hạn. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT DISTINCT ep.enrollmentEntity.courseEntity.id
        FROM EnrollmentPackageEntity ep
        WHERE ep.enrollmentEntity.userEntity.id = :userId
          AND ep.status = com.ailms.entity.enums.EnrollmentPackageStatusEnum.ACTIVE
          AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
        """)
    List<Long> findActiveCourseIdsByUser(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);

    /** Kiểm tra enrollment còn gói ACTIVE sau khi hủy hoặc hoàn tiền một order. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT CASE WHEN COUNT(ep) > 0 THEN true ELSE false END
        FROM EnrollmentPackageEntity ep
        WHERE ep.enrollmentEntity.id = :enrollmentId
          AND ep.status = com.ailms.entity.enums.EnrollmentPackageStatusEnum.ACTIVE
          AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
        """)
    boolean existsActiveByEnrollment(
            @org.springframework.data.repository.query.Param("enrollmentId") Long enrollmentId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);

    /** Kiểm tra học viên còn package ACTIVE khác cấp quyền vào cùng lớp. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT CASE WHEN COUNT(ep) > 0 THEN true ELSE false END
        FROM EnrollmentPackageEntity ep
        WHERE ep.enrollmentEntity.userEntity.id = :userId
          AND ep.coursePackageEntity.classEntity.id = :classId
          AND ep.status = com.ailms.entity.enums.EnrollmentPackageStatusEnum.ACTIVE
          AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
        """)
    boolean existsActiveClassAccess(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("classId") Long classId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);

    /** Kiểm tra người dùng đang sở hữu một gói còn hiệu lực. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT CASE WHEN COUNT(ep) > 0 THEN true ELSE false END
        FROM EnrollmentPackageEntity ep
        WHERE ep.enrollmentEntity.userEntity.id = :userId
          AND ep.coursePackageEntity.id = :packageId
          AND ep.status = com.ailms.entity.enums.EnrollmentPackageStatusEnum.ACTIVE
          AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
        """)
    boolean existsActiveOwnedPackage(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("packageId") Long packageId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);

    /** Kiểm tra người dùng còn quyền học khóa học từ ít nhất một gói. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT CASE WHEN COUNT(ep) > 0 THEN true ELSE false END
        FROM EnrollmentPackageEntity ep
        WHERE ep.enrollmentEntity.userEntity.id = :userId
          AND ep.enrollmentEntity.courseEntity.id = :courseId
          AND ep.status = com.ailms.entity.enums.EnrollmentPackageStatusEnum.ACTIVE
          AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
        """)
    boolean existsActiveCourseAccess(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("courseId") Long courseId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);

    /** Lấy các gói còn hiệu lực của người dùng trong một khóa học. */
    @org.springframework.data.jpa.repository.Query("""
        SELECT ep FROM EnrollmentPackageEntity ep
        JOIN FETCH ep.coursePackageEntity p
        WHERE ep.enrollmentEntity.userEntity.id = :userId
          AND ep.enrollmentEntity.courseEntity.id = :courseId
          AND ep.status = com.ailms.entity.enums.EnrollmentPackageStatusEnum.ACTIVE
          AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
        """)
    List<EnrollmentPackageEntity> findActiveOwnedByUserAndCourse(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("courseId") Long courseId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);

    /** Tìm gói ghi danh đã được cấp bởi order item để bảo đảm idempotent. */
    Optional<EnrollmentPackageEntity> findByOrderItemEntity_Id(Long orderItemId);

    /** Lấy các package ACTIVE còn quyền của một enrollment để dựng "Khóa học của tôi". */
    @org.springframework.data.jpa.repository.Query("""
        SELECT ep FROM EnrollmentPackageEntity ep
        JOIN FETCH ep.coursePackageEntity p
        WHERE ep.enrollmentEntity.id = :enrollmentId
          AND ep.status = com.ailms.entity.enums.EnrollmentPackageStatusEnum.ACTIVE
          AND (ep.expiresAt IS NULL OR ep.expiresAt > :now)
        """)
    List<EnrollmentPackageEntity> findActiveByEnrollment(
            @org.springframework.data.repository.query.Param("enrollmentId") Long enrollmentId,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now);
}
