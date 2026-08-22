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

    /** Lấy danh sách permission của một role. */
    @Query("""
    SELECT p
        FROM PermissionEntity p
        JOIN RolePermissionEntity rp
            ON rp.permissionEntity.id = p.id
        WHERE rp.roleEntity.id = :roleId
    """)
    List<PermissionEntity> findPermissionsByRoleId(@Param("roleId") Long roleId);

    /** Đếm số entity duy nhất. */
    @Query("SELECT COUNT(DISTINCT p.entity) FROM PermissionEntity p")
    long countDistinctEntities();


    /** Đếm permission chưa được gán cho role nào. */
    @Query("SELECT COUNT(p) FROM PermissionEntity p WHERE NOT EXISTS (SELECT rp FROM RolePermissionEntity rp WHERE rp.permissionEntity.id = p.id)")
    long countOrphanPermissions();

    /** Thống kê số permission theo entity. */
    @Query("SELECT p.entity, COUNT(p) FROM PermissionEntity p GROUP BY p.entity ORDER BY COUNT(p) DESC")
    List<Object[]> countPermissionsByEntity();

    /** Thống kê permission được sử dụng nhiều nhất. */
    @Query("SELECT p.code, COUNT(rp) FROM PermissionEntity p JOIN RolePermissionEntity rp ON rp.permissionEntity.id = p.id GROUP BY p.id, p.code ORDER BY COUNT(rp) DESC")
    List<Object[]> findTopUsedPermissions();

    /** Thống kê số permission theo action. */
    @Query("SELECT p.action, COUNT(p) FROM PermissionEntity p GROUP BY p.action")
    List<Object[]> countPermissionsByAction();

    /** Lấy danh sách entity duy nhất. */
    @Query("SELECT DISTINCT p.entity FROM PermissionEntity p WHERE p.entity IS NOT NULL ORDER BY p.entity ASC")
    List<String> findDistinctEntities();

    /** Lấy danh sách action duy nhất. */
    @Query("SELECT DISTINCT p.action FROM PermissionEntity p WHERE p.action IS NOT NULL ORDER BY p.action ASC")
    List<String> findDistinctActions();
}

