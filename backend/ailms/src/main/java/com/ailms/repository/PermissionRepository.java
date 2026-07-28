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

    @Query("SELECT COUNT(DISTINCT p.entity) FROM PermissionEntity p")
    long countDistinctEntities();

    @Query("SELECT COUNT(p) FROM PermissionEntity p WHERE NOT EXISTS (SELECT rp FROM RolePermissionEntity rp WHERE rp.permissionEntity.id = p.id)")
    long countOrphanPermissions();

    @Query("SELECT p.entity, COUNT(p) FROM PermissionEntity p GROUP BY p.entity ORDER BY COUNT(p) DESC")
    List<Object[]> countPermissionsByEntity();

    @Query("SELECT p.code, COUNT(rp) FROM PermissionEntity p JOIN RolePermissionEntity rp ON rp.permissionEntity.id = p.id GROUP BY p.id, p.code ORDER BY COUNT(rp) DESC")
    List<Object[]> findTopUsedPermissions();

    @Query("SELECT p.action, COUNT(p) FROM PermissionEntity p GROUP BY p.action")
    List<Object[]> countPermissionsByAction();
}

