package com.ailms.repository;

import com.ailms.entity.PermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<PermissionEntity, Long>, JpaSpecificationExecutor<PermissionEntity> {
    Optional<PermissionEntity> findByName(String name);
}
