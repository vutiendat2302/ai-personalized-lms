package com.ailms.repository;

import com.ailms.entity.OneOnOneRequestEntity;
import com.ailms.entity.enums.OneOnOneRequestStatusEnum;
import com.ailms.repository.base.BaseRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OneOnOneRequestRepository extends BaseRepository<OneOnOneRequestEntity, Long> {

    /** Kiểm tra yêu cầu đã được tạo từ gói ghi danh. */
    boolean existsByEnrollmentPackageEntity_Id(Long enrollmentPackageId);

    /** Lấy matching request phát sinh từ gói ghi danh để đóng khi refund. */
    Optional<OneOnOneRequestEntity> findByEnrollmentPackageEntity_Id(Long enrollmentPackageId);

    /** Lấy yêu cầu của học viên theo thời gian mới nhất. */
    List<OneOnOneRequestEntity> findByStudentEntity_IdOrderByCreatedAtDesc(Long studentId);

    /** Lấy các yêu cầu đang được phân công cho người dạy hiện tại. */
    List<OneOnOneRequestEntity> findByAssignedInstructorEntity_IdOrderByCreatedAtDesc(Long instructorId);

    /** Lấy yêu cầu theo trạng thái phục vụ HR. */
    List<OneOnOneRequestEntity> findByStatusInOrderByCreatedAtDesc(List<OneOnOneRequestStatusEnum> statuses);

    /** Khóa yêu cầu khi nhận lớp hoặc chuyển state. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM OneOnOneRequestEntity r WHERE r.id = :id")
    Optional<OneOnOneRequestEntity> findByIdForUpdate(@Param("id") Long id);

    /** Lấy matching request đang sở hữu lớp 1-1 để giới hạn số buổi chính thức. */
    Optional<OneOnOneRequestEntity> findByTrialClassEntity_Id(Long classId);

    /** Tìm yêu cầu 1-1 sở hữu buổi học thử để mở đúng form nhận xét. */
    Optional<OneOnOneRequestEntity> findByTrialSessionEntity_Id(Long sessionId);
}
