package com.ailms.repository;

import com.ailms.entity.CertificateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface CertificateRepository extends JpaRepository<CertificateEntity, Long>, JpaSpecificationExecutor<CertificateEntity> {

    Optional<CertificateEntity> findByCertificateCode(String certificateCode);

    Optional<CertificateEntity> findByEnrollmentId(Long enrollmentId);

    boolean existsByEnrollmentId(Long enrollmentId);

    /** Lấy chứng chỉ thuộc một học viên theo thời điểm cấp mới nhất. */
    List<CertificateEntity> findByUserIdOrderByIssuedAtDesc(Long userId);
}
