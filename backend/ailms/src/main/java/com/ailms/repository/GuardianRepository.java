package com.ailms.repository;

import com.ailms.entity.GuardianEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GuardianRepository extends JpaRepository<GuardianEntity, Long>, JpaSpecificationExecutor<GuardianEntity> {
    List<GuardianEntity> findByStudentProfile_UserId(Long studentUserId);

    void deleteByStudentProfile_UserId(Long studentUserId);
}
