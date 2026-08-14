package com.ailms.repository;

import com.ailms.entity.ClassEntity;
import com.ailms.entity.CourseTeacherEntity;
import com.ailms.entity.CourseTeacherId;
import com.ailms.entity.enums.CourseTeacherStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface CourseTeacherRepository extends JpaRepository<CourseTeacherEntity, CourseTeacherId>, JpaSpecificationExecutor<CourseTeacherEntity> {
    List<CourseTeacherEntity> findByCourseEntity_Id(Long courseId);
    List<CourseTeacherEntity> findByCourseEntity_IdAndStatus(Long courseId, CourseTeacherStatusEnum status);
    List<CourseTeacherEntity> findByUserEntity_Id(Long userId);
    List<CourseTeacherEntity> findByUserEntity_IdAndStatus(Long userId, CourseTeacherStatusEnum status);

    /** Kiểm tra một nhân sự có đang được phân công phụ trách khóa học hay không. */
    boolean existsByCourseEntity_IdAndUserEntity_IdAndStatus(
            Long courseId, Long userId, CourseTeacherStatusEnum status);

    /** Lấy tên giáo viên đại diện cho mỗi khóa học trong một truy vấn batch. */
    @Query("""
        SELECT ct.courseEntity.id, u.fullName
        FROM CourseTeacherEntity ct JOIN ct.userEntity u
        WHERE ct.courseEntity.id IN :courseIds
          AND ct.status = com.ailms.entity.enums.CourseTeacherStatusEnum.ACTIVE
          AND u.status = com.ailms.entity.enums.UserStatusEnum.ACTIVE
        ORDER BY ct.assignedAt ASC
        """)
    List<Object[]> findPublicTeacherNames(@Param("courseIds") List<Long> courseIds);

    /** Tổng hợp số khóa học, học viên và rating theo giáo viên bằng GROUP BY. */
    @Query("""
        SELECT ct.userEntity.id, COUNT(DISTINCT c.id), COALESCE(SUM(c.enrollmentCount), 0), COALESCE(AVG(c.avgRating), 0)
        FROM CourseTeacherEntity ct JOIN ct.courseEntity c
        WHERE ct.userEntity.id IN :teacherIds
          AND ct.status = com.ailms.entity.enums.CourseTeacherStatusEnum.ACTIVE
          AND c.status = com.ailms.entity.enums.CourseStatusEnum.ACTIVE
          AND EXISTS (SELECT p.id FROM CoursePackageEntity p WHERE p.courseEntity.id = c.id
                      AND p.status = com.ailms.entity.enums.CoursePackageStatusEnum.ACTIVE)
        GROUP BY ct.userEntity.id
        """)
    List<Object[]> findPublicTeacherStats(@Param("teacherIds") List<Long> teacherIds);
}
