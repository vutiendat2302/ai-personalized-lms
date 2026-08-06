package com.ailms.repository;

import com.ailms.entity.ClassOnlineEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface ClassOnlineRepository extends BaseRepository<ClassOnlineEntity, Long> {
    List<ClassOnlineEntity> findByClassEntity_Id(Long classId);
    List<ClassOnlineEntity> findByTeacherEntity_Id(Long teacherId);
    boolean existsByCode(String code);

    @EntityGraph(attributePaths = {"classEntity", "classEntity.courseEntity", "teacherEntity"})
    List<ClassOnlineEntity> findByScheduledAtGreaterThanEqualAndScheduledAtLessThanOrderByScheduledAtAsc(
            LocalDateTime from, LocalDateTime to);

    @Query("""
            select session from ClassOnlineEntity session
            where session.id <> :excludedId
              and session.status = com.ailms.entity.enums.BaseStatusEnum.ACTIVE
              and session.scheduledAt < :proposedEnd
              and session.scheduledAt > :windowStart
            """)
    List<ClassOnlineEntity> findPotentialConflicts(@Param("windowStart") LocalDateTime windowStart,
                                                   @Param("proposedEnd") LocalDateTime proposedEnd,
                                                   @Param("excludedId") Long excludedId);
}
