package com.ailms.repository;

import com.ailms.entity.StudentInterestEntity;
import com.ailms.entity.StudentInterestId;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface StudentInterestRepository extends JpaRepository<StudentInterestEntity, StudentInterestId> {

    List<StudentInterestEntity> findByStudentProfile_UserId(Long studentUserId);

    void deleteByStudentProfile_UserId(Long studentUserId);

    List<StudentInterestEntity> findByInterest_Id(Long interestId);

    boolean existsByInterest_Id(Long interestId);

    /** Lấy ID danh mục đã liên kết trực tiếp với các sở thích học viên đã chọn. */
    @Query("""
            SELECT DISTINCT category.id
            FROM StudentInterestEntity studentInterest
            JOIN studentInterest.interest interest
            JOIN interest.categories category
            WHERE studentInterest.studentProfile.userId = :studentUserId
              AND interest.status = 1
              AND category.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE
            """)
    List<Long> findActiveCategoryIdsByStudentUserId(
            @Param("studentUserId") Long studentUserId);

    @Query("SELECT i.name, COUNT(si) FROM StudentInterestEntity si JOIN si.interest i GROUP BY i.name ORDER BY COUNT(si) DESC")
    List<Object[]> countInterestsGroupedByName();
}
