package com.ailms.repository;

import com.ailms.entity.PermissionEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends BaseRepository<PermissionEntity, Long> {
    Optional<PermissionEntity> findByName(String name);
    Optional<PermissionEntity> findByCode(String code);
    boolean existsByName(String name);
    boolean existsByCode(String code);

    @Query("""
    SELECT p
        FROM PermissionEntity p
        JOIN RolePermissionEntity rp
            ON rp.permissionEntity.id = p.id
        WHERE rp.roleEntity.id = :roleId
    """)
    List<PermissionEntity> findPermissionsByRoleId(@Param("roleId") Long roleId);
}
