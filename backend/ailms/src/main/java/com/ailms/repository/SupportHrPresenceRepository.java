package com.ailms.repository;

import com.ailms.entity.SupportHrPresenceEntity;
import com.ailms.entity.enums.SupportHrPresenceStatusEnum;
import com.ailms.repository.base.BaseRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Truy vấn presence của HR và khóa lựa chọn người nhận ticket. */
@Repository
public interface SupportHrPresenceRepository extends BaseRepository<SupportHrPresenceEntity, Long> {
    /** Lấy presence của một HR. */
    Optional<SupportHrPresenceEntity> findByHrId(Long hrId);

    /** Khóa presence của supporter trước khi claim để chặn nhận đồng thời nhiều ticket. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM SupportHrPresenceEntity p WHERE p.hrId = :hrId")
    Optional<SupportHrPresenceEntity> findByHrIdForUpdate(@Param("hrId") Long hrId);

    /** Đếm supporter online còn heartbeat để ước tính thời gian chờ của queue chung. */
    long countByStatusInAndLastHeartbeatAtGreaterThanEqual(Collection<SupportHrPresenceStatusEnum> statuses,
                                                            LocalDateTime heartbeatSince);

    /** Lấy HR available có heartbeat còn hiệu lực theo thứ tự công bằng. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM SupportHrPresenceEntity p JOIN p.hr u WHERE p.status = :status "
            + "AND u.status = com.ailms.entity.enums.UserStatusEnum.ACTIVE "
            + "AND p.lastHeartbeatAt >= :heartbeatSince ORDER BY p.lastHeartbeatAt ASC")
    List<SupportHrPresenceEntity> findAvailableForUpdate(@Param("status") SupportHrPresenceStatusEnum status,
                                                          @Param("heartbeatSince") LocalDateTime heartbeatSince);

    /** Lấy presence của toàn bộ HR đang hoạt động cho màn hình quản lý. */
    List<SupportHrPresenceEntity> findByStatusOrderByLastHeartbeatAtDesc(SupportHrPresenceStatusEnum status);

    /** Chuyển heartbeat quá hạn sang OFFLINE để trạng thái DB phản ánh kết nối thực tế. */
    @Modifying
    @Query("UPDATE SupportHrPresenceEntity p SET p.status = com.ailms.entity.enums.SupportHrPresenceStatusEnum.OFFLINE "
            + "WHERE p.lastHeartbeatAt < :heartbeatSince AND p.status <> com.ailms.entity.enums.SupportHrPresenceStatusEnum.OFFLINE")
    int markStaleOffline(@Param("heartbeatSince") LocalDateTime heartbeatSince);
}
