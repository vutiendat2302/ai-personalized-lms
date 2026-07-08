package com.ailms.repository;

import com.ailms.entity.UserRoleEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRoleEntity, Long> {
    
    @EntityGraph(attributePaths = {"roleEntity", "roleEntity.rolePermissions", "roleEntity.rolePermissions.permissionEntity"})
    List<UserRoleEntity> findByUserEntity_Id(Long userId);

    @Query("""
        SELECT ur FROM UserRoleEntity ur
        JOIN FETCH ur.roleEntity
        WHERE ur.userEntity.id = :userId
        """)
    List<UserRoleEntity> findByUserEntity_IdWithRole(@Param("userId") Long userId);

    long countByRoleEntity_Id(Long roleId);

    boolean existsByRoleEntity_Id(Long roleId);

    List<UserRoleEntity> findByRoleEntity_Id(Long roleId);
}

