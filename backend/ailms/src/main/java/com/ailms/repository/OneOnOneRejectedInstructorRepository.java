package com.ailms.repository;

import com.ailms.entity.OneOnOneRejectedInstructorEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

/** Truy cập danh sách người dạy đã bị từ chối ở mỗi yêu cầu 1-1. */
@Repository
public interface OneOnOneRejectedInstructorRepository extends BaseRepository<OneOnOneRejectedInstructorEntity, Long> {
    /** Kiểm tra người dạy có bị chặn nhận lại yêu cầu hay không. */
    boolean existsByRequestEntity_IdAndInstructorEntity_Id(Long requestId, Long instructorId);
}
