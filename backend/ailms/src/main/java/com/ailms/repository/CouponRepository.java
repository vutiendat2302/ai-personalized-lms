package com.ailms.repository;

import com.ailms.entity.CouponEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface CouponRepository extends BaseRepository<CouponEntity, Long> {
    Optional<CouponEntity> findByCode(String code);

    /** Khóa coupon để cập nhật usedCount an toàn khi capture hoặc refund. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CouponEntity c where c.id = :id")
    Optional<CouponEntity> findByIdForUpdate(@Param("id") Long id);
}
