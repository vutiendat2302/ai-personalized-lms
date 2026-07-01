package com.ailms.repository;

import com.ailms.entity.CourseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<CourseEntity, Long>, JpaSpecificationExecutor<CourseEntity> {
    boolean existsByLinkIgnoreCase(String link);
    boolean existsByLinkIgnoreCaseAndIdNot(String link, Long id);
}
