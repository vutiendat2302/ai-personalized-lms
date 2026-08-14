package com.ailms.repository;

import com.ailms.dto.CourseSuggestion;
import com.ailms.entity.CourseEntity;
import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.entity.enums.CourseLevelEnum;
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
        WHERE c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p
                      WHERE p.courseEntity.id = c.id
                        AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
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
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p
                      WHERE p.courseEntity.id = c.id
                        AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
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
          AND (:categoryId IS NULL OR c.categoryEntity.id = :categoryId)
          AND (:level IS NULL OR c.level = :level)
        """)
    Page<CourseEntity> findActiveCoursesForSale(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("level") CourseLevelEnum level,
            Pageable pageable);

    /** Lấy khóa học công khai thuộc đúng các danh mục khớp sở thích học viên. */
    @Query("""
        SELECT c FROM CourseEntity c
        WHERE c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND c.categoryEntity.id IN :categoryIds
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p
                      WHERE p.courseEntity.id = c.id
                        AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
          AND (:keyword IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(c.categoryEntity.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY c.enrollmentCount DESC, c.avgRating DESC, c.reviewCount DESC
        """)
    Page<CourseEntity> findPersonalizedCoursesForSale(
            @Param("keyword") String keyword,
            @Param("categoryIds") List<Long> categoryIds,
            Pageable pageable);

    /** Kiểm tra khóa học đủ điều kiện hiển thị công khai và mở bán. */
    @Query("""
        SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END
        FROM CourseEntity c
        WHERE c.id = :courseId
          AND c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p
                      WHERE p.courseEntity.id = c.id
                        AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
        """)
    boolean isPubliclySellable(@Param("courseId") Long courseId);

    /** Lấy khóa học công khai trong danh mục khi có ít nhất một gói đang bán. */
    @Query("""
        SELECT c FROM CourseEntity c
        WHERE c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND c.categoryEntity.id = :categoryId
          AND (:level IS NULL OR c.level = :level)
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p WHERE p.courseEntity.id = c.id
                      AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
        ORDER BY c.enrollmentCount DESC, c.avgRating DESC, c.reviewCount DESC, c.createdAt DESC
        """)
    Page<CourseEntity> findPublicCoursesByCategory(@Param("categoryId") Long categoryId,
                                                     @Param("level") CourseLevelEnum level,
                                                     Pageable pageable);

    /** Lấy khóa học công khai mà giáo viên đang phụ trách. */
    @Query("""
        SELECT c FROM CourseEntity c
        WHERE c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND (:level IS NULL OR c.level = :level)
          AND (:categoryId IS NULL OR c.categoryEntity.id = :categoryId)
          AND EXISTS (SELECT ct.id FROM CourseTeacherEntity ct WHERE ct.courseEntity.id = c.id
                      AND ct.userEntity.id = :teacherId
                      AND ct.status = com.ailms.entity.enums.CourseTeacherStatusEnum.ACTIVE)
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p WHERE p.courseEntity.id = c.id
                      AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
        ORDER BY c.enrollmentCount DESC, c.avgRating DESC, c.createdAt DESC
        """)
    Page<CourseEntity> findPublicCoursesByTeacher(@Param("teacherId") Long teacherId,
                                                   @Param("level") CourseLevelEnum level,
                                                   @Param("categoryId") Long categoryId,
                                                   Pageable pageable);

    /** Lấy khóa học liên quan dựa trên giáo viên chung với danh mục hiện tại. */
    @Query("""
        SELECT c FROM CourseEntity c
        WHERE c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND c.categoryEntity.id <> :categoryId
          AND EXISTS (SELECT ct.id FROM CourseTeacherEntity ct
                      WHERE ct.courseEntity.id = c.id
                        AND ct.status = com.ailms.entity.enums.CourseTeacherStatusEnum.ACTIVE
                        AND EXISTS (SELECT sourceCt.id FROM CourseTeacherEntity sourceCt
                                    WHERE sourceCt.courseEntity.categoryEntity.id = :categoryId
                                      AND sourceCt.userEntity.id = ct.userEntity.id
                                      AND sourceCt.status = com.ailms.entity.enums.CourseTeacherStatusEnum.ACTIVE))
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p WHERE p.courseEntity.id = c.id
                      AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
        ORDER BY c.enrollmentCount DESC, c.avgRating DESC, c.createdAt DESC
        """)
    Page<CourseEntity> findRelatedPublicCourses(@Param("categoryId") Long categoryId, Pageable pageable);

    /** Lấy batch khóa học công khai có bất kỳ gói đang bán để lọc semantic search. */
    @Query("""
        SELECT c FROM CourseEntity c
        WHERE c.id IN :ids
          AND c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p WHERE p.courseEntity.id = c.id
                      AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
        """)
    List<CourseEntity> findPublicCoursesByIds(@Param("ids") List<Long> ids);
}
