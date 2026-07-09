package com.ailms.repository;

import com.ailms.entity.TeachingSessionPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeachingSessionPaymentRepository extends JpaRepository<TeachingSessionPaymentEntity, Long>, JpaSpecificationExecutor<TeachingSessionPaymentEntity> {
    Optional<TeachingSessionPaymentEntity> findByClassOnlineId(Long classOnlineId);
    List<TeachingSessionPaymentEntity> findByEmployee_UserId(Long userId);
}
