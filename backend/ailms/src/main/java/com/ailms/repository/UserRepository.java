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

    long countByStatusNot(UserStatusEnum userStatusEnum);

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

    List<UserEntity> findByStatus(UserStatusEnum userStatusEnum);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM attendance WHERE employee_id = :id", nativeQuery = true)
    void deleteAttendancesByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM leave_request WHERE employee_id = :id", nativeQuery = true)
    void deleteLeaveRequestsByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM employee_contract WHERE employee_id = :id", nativeQuery = true)
    void deleteEmployeeContractsByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM salary WHERE employee_id = :id", nativeQuery = true)
    void deleteSalariesByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM teaching_rate WHERE employee_id = :id", nativeQuery = true)
    void deleteTeachingRatesByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM employee WHERE user_id = :id", nativeQuery = true)
    void deleteEmployeeByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM guardian WHERE student_user_id = :id", nativeQuery = true)
    void deleteGuardiansByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM student_interest WHERE student_user_id = :id", nativeQuery = true)
    void deleteStudentInterestsByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM student_profile WHERE user_id = :id", nativeQuery = true)
    void deleteStudentProfileByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM user_role WHERE user_id = :id", nativeQuery = true)
    void deleteUserRolesByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM audit_log WHERE user_id = :id", nativeQuery = true)
    void deleteAuditLogsByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM notification WHERE user_id = :id", nativeQuery = true)
    void deleteNotificationsByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM cart_item WHERE user_id = :id", nativeQuery = true)
    void deleteCartItemsByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM review WHERE user_id = :id", nativeQuery = true)
    void deleteReviewsByUserId(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "DELETE FROM `user` WHERE id = :id", nativeQuery = true)
    void deleteUserByIdNative(@Param("id") Long id);
}



