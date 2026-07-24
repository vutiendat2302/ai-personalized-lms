package com.ailms.repository;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LearningActivityLogRepository extends BaseRepository<LearningActivityLogEntity, Long> {
    List<LearningActivityLogEntity> findByUserId(Long userId);

    void deleteByUserId(Long userId);

    List<LearningActivityLogEntity> findByEntityTypeAndEntityId(String entityType, Long entityId);
}
