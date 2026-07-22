package com.ailms.repository;

import com.ailms.entity.AuditLogEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends BaseRepository<AuditLogEntity, Long> {
    List<AuditLogEntity> user(UserEntity user);

    List<AuditLogEntity> findByUser_Id(Long userId);
}

