package com.ailms.repository;

import com.ailms.entity.TeachingRateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeachingRateRepository extends JpaRepository<TeachingRateEntity, Long>, JpaSpecificationExecutor<TeachingRateEntity> {
    List<TeachingRateEntity> findByEmployee_UserId(Long userId);
}
