package com.ailms.repository;

import com.ailms.entity.ClassEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassRepository extends BaseRepository<ClassEntity, Long> {
    List<ClassEntity> findByCourseEntity_Id(Long courseId);

    boolean existsByCode(String code);
}
