package com.ailms.repository;

import com.ailms.entity.RolePermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Set;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermissionEntity, Long> {
    List<RolePermissionEntity> findByRoleEntity_Id(Long roleId);

    @Query("""
        SELECT rp FROM RolePermissionEntity rp
        JOIN FETCH rp.permissionEntity
        WHERE rp.roleEntity.id IN :roleIds
    """)
    List<RolePermissionEntity> findByRoleEntity_IdIn(@Param("roleIds") Collection<Long> roleIds);

    long countByPermissionEntity_Id(Long permissionId);

    boolean existsByPermissionEntity_Id(Long permissionId);

    @Modifying
    @Query("""
        DELETE FROM RolePermissionEntity rp
        WHERE rp.roleEntity.id = :roleId
          AND rp.permissionEntity.id NOT IN :permissionIds
    """)
    void deletePermissionsNotIn(
            @Param("roleId") Long roleId,
            @Param("permissionIds") Set<Long> permissionIds);

    void deleteByRoleEntity_Id(Long roleId);
}

