package com.ailms.repository;

import com.ailms.entity.TeacherCategoryEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface TeacherCategoryRepository extends JpaRepository<TeacherCategoryEntity, Long>, JpaSpecificationExecutor<TeacherCategoryEntity> {

    List<TeacherCategoryEntity> findByEmployee_UserId(Long employeeId);

    List<TeacherCategoryEntity> findByEmployee_UserIdAndStatus(Long employeeId, BaseStatusEnum status);

    /** Lấy chuyên ngành của nhiều giáo viên trong một truy vấn batch. */
    List<TeacherCategoryEntity> findByEmployee_UserIdInAndStatus(List<Long> employeeIds, BaseStatusEnum status);

    /** Lấy projection chuyên ngành của nhiều giáo viên, không lazy-load từng category. */
    @Query("""
        SELECT tc.employee.userId, cat.id, cat.name, cat.description
        FROM TeacherCategoryEntity tc JOIN tc.category cat
        WHERE tc.employee.userId IN :employeeIds AND tc.status = :status
        ORDER BY cat.name ASC
        """)
    List<Object[]> findPublicTeacherCategories(@Param("employeeIds") List<Long> employeeIds,
                                                @Param("status") BaseStatusEnum status);

    List<TeacherCategoryEntity> findByCategory_IdAndStatus(Long categoryId, BaseStatusEnum status);

    Optional<TeacherCategoryEntity> findByEmployee_UserIdAndCategory_Id(Long employeeId, Long categoryId);

    boolean existsByEmployee_UserIdAndCategory_Id(Long employeeId, Long categoryId);

    boolean existsByEmployee_UserIdAndCategory_IdAndStatus(Long employeeId, Long categoryId, BaseStatusEnum status);
}
