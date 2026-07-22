package com.ailms.repository;

import com.ailms.entity.TeachingRateEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeachingRateRepository extends BaseRepository<TeachingRateEntity, Long> {

    List<TeachingRateEntity> findByEmployeeEntity_UserId(Long employeeId);
}
