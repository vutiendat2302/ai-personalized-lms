package com.ailms.repository;

import com.ailms.entity.UserRoleEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRoleEntity, Long> {
    
    @EntityGraph(attributePaths = {"roleEntity", "roleEntity.rolePermissions", "roleEntity.rolePermissions.permissionEntity"})
    List<UserRoleEntity> findByUserEntity_Id(Long userId);
}
