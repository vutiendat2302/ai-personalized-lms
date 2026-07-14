package com.ailms.repository;

import com.ailms.entity.UserRoleEntity;
import jakarta.persistence.Entity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.security.core.parameters.P;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

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


    @EntityGraph(attributePaths = {"roleEntity.rolePermissions.permissionEntity"})
    @Query("""
        select distinct ur
        from UserRoleEntity ur
        where ur.userEntity.id = :userId
        and (ur.expiredAt is null or ur.expiredAt > :now)
        and (ur.assignedAt <= :now)
    """)
    List<UserRoleEntity> findActiveUserRoleWithPermissions(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}

