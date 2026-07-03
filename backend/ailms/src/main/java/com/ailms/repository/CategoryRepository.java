package com.ailms.repository;

import com.ailms.entity.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CategoryRepository extends JpaRepository<CategoryEntity, Long>, JpaSpecificationExecutor<CategoryEntity> {
    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    Optional<CategoryEntity> findByNameIgnoreCase(String name);



//    @Query("SELECT COUNT(c) " +
//            "FROM CourseEntity c " +
//            "WHERE c.categoryEntity.id = :categoryId")
//    long countCoursesByCategoryId(@Param("categoryId") Long categoryId);
}
