package com.ailms.repository;

import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoursePackageRepository extends BaseRepository<CoursePackageEntity, Long> {
    /** Tìm các gói thuộc một khóa học. */
    List<CoursePackageEntity> findByCourseEntity_Id(Long courseId);

    /** Kiểm tra mã gói đã tồn tại. */
    boolean existsByCode(String code);

    /** Đếm gói theo trạng thái. */
    long countByStatus(CoursePackageStatusEnum status);

    /** Đếm gói theo trạng thái và hình thức đào tạo. */
    long countByStatusAndDeliveryMode(CoursePackageStatusEnum status, DeliveryModeEnum deliveryMode);

    /** Ẩn toàn bộ gói khi khóa học ngừng hoạt động. */
    @Modifying
    @Query("UPDATE CoursePackageEntity p SET p.status = CoursePackageStatusEnum.INACTIVE WHERE p.courseEntity.id = :courseId")
    void deactivateAllByCourseId(@Param("courseId") Long courseId);

    /** Lấy các gói đang mở bán của khóa học. */
    List<CoursePackageEntity> findByCourseEntity_IdAndStatus(Long courseId, CoursePackageStatusEnum status);

    /** Đếm gói tự học đang hoạt động của khóa học. */
    long countByCourseEntity_IdAndDeliveryModeAndStatus(
            Long courseId, DeliveryModeEnum deliveryMode, CoursePackageStatusEnum status);

    /** Khóa gói trong lúc checkout để giá và trạng thái không đổi giữa chừng. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_READ)
    @Query("SELECT p FROM CoursePackageEntity p WHERE p.id = :id")
    Optional<CoursePackageEntity> findByIdForCheckout(@Param("id") Long id);
}
