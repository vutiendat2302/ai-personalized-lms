package com.ailms.repository;

import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends BaseRepository<UserEntity, Long> {

    @Query("SELECT u FROM UserEntity u WHERE u.username = :usernameOrEmail OR u.email = :usernameOrEmail")
    Optional<UserEntity> findByUsernameOrEmail(@Param("usernameOrEmail") String usernameOrEmail);

    @Query("SELECT u FROM UserEntity u WHERE u.username = :info OR u.email = :info OR u.phone = :info")
    Optional<UserEntity> findByUsernameOrEmailOrPhone(@Param("info") String info);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    Optional<UserEntity> findByEmail(String email);

    UserEntity findByFullName(String fullName);

    UserEntity findByUsername(String userName);

    @Query("SELECT u.gender, COUNT(u) FROM UserEntity u WHERE u.status != UserStatusEnum.DELETED GROUP BY u.gender")
    java.util.List<Object[]> countUsersGroupByGender();

    @Query("SELECT MONTH(u.createdAt), COUNT(u) FROM UserEntity u WHERE YEAR(u.createdAt) = :year AND u.status != UserStatusEnum.DELETED GROUP BY MONTH(u.createdAt)")
    java.util.List<Object[]> countMonthlyNewUsersByYear(@Param("year") int year);

    List<UserEntity> findAllByStatusNot(UserStatusEnum userStatusEnum);

    @Query("SELECT u.status, COUNT(u) FROM UserEntity u GROUP BY u.status")
    List<Object[]> countUsersGroupByStatus();

    /**
     * Lấy danh sách user theo tên role, dùng cho việc gửi thông báo theo role.
     */
    @Query("""
            SELECT DISTINCT ur.userEntity FROM UserRoleEntity ur
            WHERE ur.roleEntity.name = :roleName
            AND ur.userEntity.status != com.ailms.entity.enums.UserStatusEnum.DELETED
            """)
    List<UserEntity> findUsersByRoleName(@Param("roleName") String roleName);
}



