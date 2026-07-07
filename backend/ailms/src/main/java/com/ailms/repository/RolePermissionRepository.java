package com.ailms.repository;

import com.ailms.entity.RolePermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermissionEntity, Long> {
    List<RolePermissionEntity> findByRoleEntity_Id(Long roleId);

    // Lấy tất cả permission của NHIỀU role trong 1 query duy nhất, JOIN FETCH permission luôn để tránh lazy loading thêm
    @Query("""
        SELECT rp FROM RolePermissionEntity rp
        JOIN FETCH rp.permissionEntity
        WHERE rp.roleEntity.id IN :roleIds
    """)
    List<RolePermissionEntity> findByRoleEntity_IdIn(@Param("roleIds") Collection<Long> roleIds);
}
