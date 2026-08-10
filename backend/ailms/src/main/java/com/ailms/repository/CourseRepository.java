package com.ailms.repository;

import com.ailms.dto.CourseSuggestion;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.repository.base.BaseRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends BaseRepository<CourseEntity, Long> {
    /** Kiểm tra mã khóa học đã tồn tại. */
    boolean existsByCode(String code);

    boolean existsByLinkIgnoreCase(String link);
    boolean existsByLinkIgnoreCaseAndIdNot(String link, Long id);

    boolean existsByNameIgnoreCaseAndCategoryEntity_Id(@NotBlank(message = "Course name must not be blank") @Size(max = 100, message = "Course name must not exceed 100 characters") String name, @NotNull(message = "Category ID is required") Long categoryId);

    Page<CourseEntity> findByStatus(CourseStatusEnum status, Pageable pageable);

    long countByStatus(CourseStatusEnum status);

    long countByCategoryEntity_Id(Long categoryId);

    @Query("""
        SELECT new com.ailms.dto.CourseSuggestion(
            c.id, c.name, c.link, cat.name, c.suggestedPrice, c.avgRating
        )
        FROM CourseEntity c
        JOIN c.categoryEntity cat
        WHERE c.status != com.ailms.entity.enums.CourseStatusEnum.INACTIVE
          AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(cat.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY
          CASE WHEN LOWER(c.name) LIKE LOWER(CONCAT(:keyword, '%')) THEN 0 ELSE 1 END,
          c.reviewCount DESC
        """)
    List<CourseSuggestion> findSuggestedKeywords(@Param("keyword") String keyword, Pageable pageable);

    @Query("""
        SELECT new com.ailms.dto.CourseSuggestion(
            c.id, c.name, c.link, cat.name, c.suggestedPrice, c.avgRating
        )
        FROM CourseEntity c
        JOIN c.categoryEntity cat
        WHERE c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
        ORDER BY c.trendingScore DESC, c.reviewCount DESC, c.avgRating DESC
        """)
    List<CourseSuggestion> findTopActiveCourses(Pageable pageable);

    /** Lấy khóa học đang bán, hỗ trợ tìm kiếm theo tên, mã hoặc danh mục. */
    @Query("""
        SELECT c FROM CourseEntity c
        WHERE c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p
                      WHERE p.courseEntity.id = c.id
                        AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
          AND (:keyword IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(c.categoryEntity.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY c.enrollmentCount DESC,
          (SELECT COUNT(r.id) FROM ReviewEntity r
           WHERE r.courseId = c.id AND r.rating = 5
             AND r.status = com.ailms.entity.enums.ReviewStatusEnum.ACTIVE) DESC,
          c.avgRating DESC
        """)
    Page<CourseEntity> findActiveCoursesForSale(@Param("keyword") String keyword, Pageable pageable);
}
