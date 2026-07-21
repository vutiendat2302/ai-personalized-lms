package com.ailms.repository;

import com.ailms.entity.CertificateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<CertificateEntity, Long>, JpaSpecificationExecutor<CertificateEntity> {

    Optional<CertificateEntity> findByCertificateCode(String certificateCode);

    Optional<CertificateEntity> findByEnrollmentId(Long enrollmentId);

    boolean existsByEnrollmentId(Long enrollmentId);
}
