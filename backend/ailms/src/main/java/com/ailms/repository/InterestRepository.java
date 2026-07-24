package com.ailms.repository;

import com.ailms.entity.InterestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InterestRepository extends JpaRepository<InterestEntity, Long>, JpaSpecificationExecutor<InterestEntity> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}
