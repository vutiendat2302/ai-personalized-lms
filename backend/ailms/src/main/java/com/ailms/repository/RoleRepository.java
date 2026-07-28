package com.ailms.repository;

import com.ailms.entity.RoleEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends BaseRepository<RoleEntity, Long> {
    Optional<RoleEntity> findByName(String name);
    Optional<RoleEntity> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByName(String name);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) FROM RoleEntity r WHERE r.isSystem = true")
    long countSystemRoles();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) FROM RoleEntity r WHERE r.isSystem = false")
    long countCustomRoles();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) FROM RoleEntity r WHERE NOT EXISTS (SELECT ur FROM UserRoleEntity ur WHERE ur.roleEntity.id = r.id)")
    long countUnusedRoles();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) FROM RoleEntity r WHERE NOT EXISTS (SELECT rp FROM RolePermissionEntity rp WHERE rp.roleEntity.id = r.id)")
    long countEmptyRoles();

    @org.springframework.data.jpa.repository.Query("SELECT r.name, COUNT(rp) FROM RoleEntity r LEFT JOIN r.rolePermissions rp GROUP BY r.id, r.name")
    java.util.List<Object[]> countPermissionsByRole();
}


