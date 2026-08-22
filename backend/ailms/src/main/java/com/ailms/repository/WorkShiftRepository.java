package com.ailms.repository;

import com.ailms.entity.WorkShiftEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/** Truy cập cấu hình ca làm việc, bao gồm tra cứu theo tên ca. */
@Repository
public interface WorkShiftRepository extends BaseRepository<WorkShiftEntity, Long> {
    Optional<WorkShiftEntity> findByName(String name);
}
