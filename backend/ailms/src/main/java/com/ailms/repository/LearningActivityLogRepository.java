package com.ailms.repository;

import com.ailms.entity.LearningActivityLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LearningActivityLogRepository extends JpaRepository<LearningActivityLogEntity, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<LearningActivityLogEntity> {
    List<LearningActivityLogEntity> findByUserId(Long userId);
    List<LearningActivityLogEntity> findByEntityTypeAndEntityId(String entityType, Long entityId);
}
