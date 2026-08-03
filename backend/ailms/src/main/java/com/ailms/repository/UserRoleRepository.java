package com.ailms.repository;

import com.ailms.entity.UserRoleEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserRoleRepository extends BaseRepository<UserRoleEntity, Long> {
    
    @EntityGraph(attributePaths = {"roleEntity", "roleEntity.rolePermissions", "roleEntity.rolePermissions.permissionEntity"})
    List<UserRoleEntity> findByUserEntity_Id(Long userId);

    @Query("""
        SELECT ur FROM UserRoleEntity ur
        JOIN FETCH ur.roleEntity
        WHERE ur.userEntity.id = :userId
        """)
    List<UserRoleEntity> findByUserEntity_IdWithRole(@Param("userId") Long userId);

    long countByRoleEntity_Id(Long roleId);

    @Query("""
        SELECT DISTINCT ur.userEntity.email FROM UserRoleEntity ur
        WHERE ur.roleEntity.code IN ('ADMIN', 'HR', 'ROLE_ADMIN', 'ROLE_HR')
           OR ur.roleEntity.name IN ('ADMIN', 'HR', 'ROLE_ADMIN', 'ROLE_HR')
    """)
    List<String> findAdminAndHrEmails();

    @Query("""
        SELECT DISTINCT ur.userEntity FROM UserRoleEntity ur
        JOIN ur.roleEntity role
        WHERE UPPER(role.code) IN ('HR', 'ROLE_HR')
           OR UPPER(role.name) IN ('HR', 'ROLE_HR', 'NHÂN SỰ')
        """)
    List<UserEntity> findHrUsers();

    boolean existsByRoleEntity_Id(Long roleId);

    @Query("""
        SELECT CASE WHEN COUNT(ur) > 0 THEN true ELSE false END
        FROM UserRoleEntity ur
        WHERE ur.userEntity.id = :userId
          AND UPPER(ur.roleEntity.code) IN ('TEACHER', 'ROLE_TEACHER')
          AND (ur.assignedAt IS NULL OR ur.assignedAt <= :now)
          AND (ur.expiredAt IS NULL OR ur.expiredAt > :now)
        """)
    boolean hasActiveTeacherRole(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    List<UserRoleEntity> findByRoleEntity_Id(Long roleId);

    void deleteByRoleEntity_Id(Long roleId);


    @EntityGraph(attributePaths = {"roleEntity.rolePermissions.permissionEntity"})
    @Query("""
        select distinct ur
        from UserRoleEntity ur
        where ur.userEntity.id = :userId
        and (ur.expiredAt is null or ur.expiredAt > :now)
        and (ur.assignedAt <= :now)
    """)
    List<UserRoleEntity> findActiveUserRoleWithPermissions(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Query("""
        SELECT r.code, COUNT(DISTINCT ur.userEntity.id)
        FROM UserRoleEntity ur
        JOIN ur.roleEntity r
        WHERE (ur.expiredAt IS NULL OR ur.expiredAt > CURRENT_TIMESTAMP) and r.code <> "STUDENT"
        GROUP BY r.code
    """)
    List<Object[]> countUsersGroupByRole();
}
