package com.ailms.repository;

import com.ailms.entity.EnrollmentPackageEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EnrollmentPackageRepository extends BaseRepository<EnrollmentPackageEntity, Long> {
    List<EnrollmentPackageEntity> findByEnrollmentEntity_Id(Long enrollmentId);
    List<EnrollmentPackageEntity> findByEnrollmentEntity_IdAndExpiresAtAfter(Long enrollmentId, LocalDateTime now);
    List<EnrollmentPackageEntity> findByExpiresAtBefore(LocalDateTime now);
}
