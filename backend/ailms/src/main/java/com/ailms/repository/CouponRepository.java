package com.ailms.repository;

import com.ailms.entity.CouponEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CouponRepository extends BaseRepository<CouponEntity, Long> {
    Optional<CouponEntity> findByCode(String code);
}
