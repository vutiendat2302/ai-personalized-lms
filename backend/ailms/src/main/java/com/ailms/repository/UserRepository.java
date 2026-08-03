package com.ailms.repository;

import com.ailms.entity.UserEntity;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.repository.base.BaseRepository;
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

    @Query("SELECT u.gender, COUNT(u) FROM UserEntity u WHERE u.status <> :excludedStatus GROUP BY u.gender")
    List<Object[]> countUsersGroupByGender(@Param("excludedStatus") UserStatusEnum excludedStatus);

    @Query("SELECT MONTH(u.createdAt), COUNT(u) FROM UserEntity u WHERE YEAR(u.createdAt) = :year AND u.status <> :excludedStatus GROUP BY MONTH(u.createdAt)")
    List<Object[]> countMonthlyNewUsersByYear(@Param("year") int year,
                                              @Param("excludedStatus") UserStatusEnum excludedStatus);

    List<UserEntity> findAllByStatusNot(UserStatusEnum userStatusEnum);

    long countByStatusNot(UserStatusEnum userStatusEnum);

    @Query("SELECT u.status, COUNT(u) FROM UserEntity u GROUP BY u.status")
    List<Object[]> countUsersGroupByStatus();

    /**
     * Lấy danh sách user theo tên role, dùng cho việc gửi thông báo theo role.
     */
    @Query("""
            SELECT DISTINCT ur.userEntity FROM UserRoleEntity ur
            WHERE (UPPER(ur.roleEntity.code) = UPPER(:roleName)
                OR UPPER(ur.roleEntity.name) = UPPER(:roleName))
            AND ur.userEntity.status <> :excludedStatus
            """)
    List<UserEntity> findUsersByRoleName(@Param("roleName") String roleName,
                                         @Param("excludedStatus") UserStatusEnum excludedStatus);

    List<UserEntity> findByStatus(UserStatusEnum userStatusEnum);

}
