package com.ailms.repository;

import com.ailms.entity.ClassEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassRepository extends BaseRepository<ClassEntity, Long> {
    List<ClassEntity> findByCourseEntity_Id(Long courseId);

    boolean existsByCode(String code);

    /** Khóa lớp khi kiểm tra và giữ chỗ cho thanh toán lớp nhóm. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT c FROM ClassEntity c WHERE c.id = :id")
    Optional<ClassEntity> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
