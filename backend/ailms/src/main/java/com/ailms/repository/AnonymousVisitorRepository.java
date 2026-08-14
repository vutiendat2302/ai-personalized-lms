package com.ailms.repository;

import com.ailms.entity.AnonymousVisitorEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Truy vấn danh tính visitor ẩn danh theo token hash. */
@Repository
public interface AnonymousVisitorRepository extends BaseRepository<AnonymousVisitorEntity, Long> {
    /** Tìm visitor bằng hash token để xác thực request public. */
    Optional<AnonymousVisitorEntity> findByVisitorTokenHash(String visitorTokenHash);
}
