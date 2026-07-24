package com.ailms.repository;

import com.ailms.entity.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

import com.ailms.repository.base.BaseRepository;

public interface CategoryRepository extends BaseRepository<CategoryEntity, Long> {
    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    Optional<CategoryEntity> findByNameIgnoreCase(String name);

}
