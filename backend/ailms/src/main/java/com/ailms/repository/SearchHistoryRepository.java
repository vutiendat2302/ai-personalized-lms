package com.ailms.repository;

import com.ailms.dto.CourseSuggestion;
import com.ailms.entity.SearchHistoryEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SearchHistoryRepository extends BaseRepository<SearchHistoryEntity, Long> {

    /**
     * Giả định mỗi (user_id, keyword) chỉ có duy nhất 1 dòng
     * nhờ cơ chế upsert ở SearchHistoryServiceImpl#saveSearchHistory
     * + UNIQUE constraint (user_id, keyword) ở tầng DB.
     */
    @Query("""
        SELECT h FROM SearchHistoryEntity h
        WHERE h.user.id = :userId
        ORDER BY COALESCE(h.updatedAt, h.createdAt) DESC
        """)
    List<SearchHistoryEntity> findByUserIdOrderByLastSearch(@Param("userId") Long userId, Pageable pageable);

    Optional<SearchHistoryEntity> findByUserIdAndKeyword(Long userId, String keyword);

    /**
     * Lấy danh sách các khóa học gợi ý dựa trên từ khóa tìm kiếm hoặc đối tượng khóa học được lưu trong khoảng thời gian từ fromDate tới nay.
     */
    @Query("""
        SELECT new com.ailms.dto.CourseSuggestion(
            c.id, c.name, c.link, cat.name, c.suggestedPrice, c.avgRating
        )
        FROM SearchHistoryEntity sh
        JOIN CourseEntity c ON (sh.course = c OR (sh.course IS NULL AND LOWER(c.name) LIKE LOWER(CONCAT('%', sh.keyword, '%'))))
        JOIN c.categoryEntity cat
        WHERE (sh.updatedAt >= :fromDate OR (sh.updatedAt IS NULL AND sh.createdAt >= :fromDate))
          AND c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p
                      WHERE p.courseEntity.id = c.id
                        AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
        GROUP BY c.id, c.name, c.link, cat.name, c.suggestedPrice, c.avgRating, c.reviewCount
        ORDER BY COUNT(sh.id) DESC, c.reviewCount DESC
        """)
    List<CourseSuggestion> findPopularCoursesBySearchHistory(@Param("fromDate") LocalDateTime fromDate, Pageable pageable);
}
