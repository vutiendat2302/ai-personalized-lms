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

@Repository
public interface CoursePackageRepository extends BaseRepository<CoursePackageEntity, Long> {
    /** Tìm các gói thuộc một khóa học. */
    List<CoursePackageEntity> findByCourseEntity_Id(Long courseId);

    /** Kiểm tra mã gói đã tồn tại. */
    boolean existsByCode(String code);

    /** Kiểm tra lớp đã được gắn với gói khác. */
    boolean existsByClassEntity_Id(Long classId);

    /** Kiểm tra lớp đã được gắn với gói khác, bỏ qua gói đang cập nhật. */
    boolean existsByClassEntity_IdAndIdNot(Long classId, Long packageId);

    /** Đếm gói theo trạng thái. */
    long countByStatus(CoursePackageStatusEnum status);

    /** Đếm gói theo trạng thái và hình thức đào tạo. */
    long countByStatusAndDeliveryMode(CoursePackageStatusEnum status, DeliveryModeEnum deliveryMode);

    /** Ẩn toàn bộ gói khi khóa học ngừng hoạt động. */
    @Modifying
    @Query("UPDATE CoursePackageEntity p SET p.status = CoursePackageStatusEnum.INACTIVE WHERE p.courseEntity.id = :courseId")
    void deactivateAllByCourseId(@Param("courseId") Long courseId);
}
