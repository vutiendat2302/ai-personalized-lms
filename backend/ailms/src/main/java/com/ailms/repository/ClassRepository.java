package com.ailms.repository;

import com.ailms.entity.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassRepository extends JpaRepository<ClassEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<ClassEntity> {
    List<ClassEntity> findByCourseEntity_Id(Long courseId);
}
