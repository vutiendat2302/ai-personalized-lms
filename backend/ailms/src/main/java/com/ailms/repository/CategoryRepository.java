package com.ailms.repository;

import com.ailms.entity.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.ailms.entity.enums.BaseStatusEnum;

import com.ailms.repository.base.BaseRepository;

public interface CategoryRepository extends BaseRepository<CategoryEntity, Long> {
    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    Optional<CategoryEntity> findByNameIgnoreCase(String name);

    /** Đếm khóa học công khai theo danh mục bằng GROUP BY. */
    @Query("""
        SELECT cat.id, cat.name, cat.description, COUNT(c.id), COALESCE(SUM(c.enrollmentCount), 0)
        FROM CategoryEntity cat LEFT JOIN cat.courses c
        WHERE cat.status = :categoryStatus
          AND (c IS NULL OR (c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
               AND EXISTS (SELECT p.id FROM CoursePackageEntity p WHERE p.courseEntity.id = c.id
                           AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)))
        GROUP BY cat.id, cat.name, cat.description
        ORDER BY COUNT(c.id) DESC, COALESCE(SUM(c.enrollmentCount), 0) DESC, cat.name ASC
        """)
    List<Object[]> findPublicCategoryCourseCounts(@Param("categoryStatus") BaseStatusEnum categoryStatus);

    /** Lấy danh mục hoạt động có phân trang. */
    @Query("SELECT cat FROM CategoryEntity cat WHERE cat.status = :status")
    Page<CategoryEntity> findActiveCategories(@Param("status") BaseStatusEnum status, Pageable pageable);

    /** Lấy danh mục khác để phục vụ related khi chưa có bảng quan hệ category. */
    @Query("SELECT cat FROM CategoryEntity cat WHERE cat.status = :status AND cat.id <> :categoryId ORDER BY cat.name ASC")
    List<CategoryEntity> findOtherActiveCategories(@Param("categoryId") Long categoryId,
                                                     @Param("status") BaseStatusEnum status,
                                                     Pageable pageable);

    /** Lấy các category theo ID để giữ thứ tự semantic do AI Service trả về ở service. */
    List<CategoryEntity> findByIdInAndStatus(List<Long> ids, BaseStatusEnum status);

    /** Tìm category ACTIVE theo tên cho Support picker. */
    @Query("SELECT cat FROM CategoryEntity cat WHERE cat.status = :status AND (:keyword IS NULL OR LOWER(cat.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) ORDER BY cat.name")
    List<CategoryEntity> findActiveCategoriesByKeyword(@Param("status") BaseStatusEnum status,
                                                        @Param("keyword") String keyword, Pageable pageable);

}
