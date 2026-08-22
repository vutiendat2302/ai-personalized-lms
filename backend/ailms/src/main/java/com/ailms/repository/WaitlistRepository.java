package com.ailms.repository;

import com.ailms.entity.WaitlistEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WaitlistRepository extends JpaRepository<WaitlistEntity, Long>, JpaSpecificationExecutor<WaitlistEntity> {

    List<WaitlistEntity> findByClassId(Long classId);

    boolean existsByClassIdAndUserId(Long classId, Long userId);
}
