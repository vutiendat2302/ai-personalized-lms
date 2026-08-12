package com.ailms.repository;

import com.ailms.entity.UserCouponEntity;
import com.ailms.entity.enums.UserCouponStatusEnum;
import com.ailms.repository.base.BaseRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Truy cập và khóa quyền voucher theo người dùng. */
public interface UserCouponRepository extends BaseRepository<UserCouponEntity, Long> {

    /** Lấy danh sách voucher của học viên cùng dữ liệu coupon để hiển thị. */
    @EntityGraph(attributePaths = {"couponEntity", "couponEntity.applicableCourseEntity"})
    List<UserCouponEntity> findByUserEntity_IdOrderByCreatedAtDesc(Long userId);

    /** Khóa voucher khả dụng theo mã trong lúc tạo checkout. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select uc from UserCouponEntity uc join fetch uc.couponEntity c
            where uc.userEntity.id = :userId and upper(c.code) = upper(:code)
              and uc.status = com.ailms.entity.enums.UserCouponStatusEnum.AVAILABLE
            """)
    Optional<UserCouponEntity> findAvailableByUserAndCodeForUpdate(
            @Param("userId") Long userId, @Param("code") String code);

    /** Khóa quyền voucher theo ID trước khi capture, hủy hoặc refund. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select uc from UserCouponEntity uc join fetch uc.couponEntity where uc.id = :id")
    Optional<UserCouponEntity> findByIdForUpdate(@Param("id") Long id);

    /** Kiểm tra voucher đã được cấp cho học viên hay chưa. */
    boolean existsByUserEntity_IdAndCouponEntity_Id(Long userId, Long couponId);

    /** Đếm số quyền voucher đang giữ chỗ để không bán vượt global maxUsage. */
    long countByCouponEntity_IdAndStatus(Long couponId, UserCouponStatusEnum status);

    /** Lấy các voucher đang giữ bởi order hết hạn để giải phóng. */
    List<UserCouponEntity> findByStatusAndReservedOrderIdIn(UserCouponStatusEnum status, List<Long> orderIds);
}
