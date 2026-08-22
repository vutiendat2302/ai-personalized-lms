package com.ailms.repository;

import com.ailms.entity.StudyGoalEntity;
import com.ailms.entity.enums.StudyGoalStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudyGoalRepository extends BaseRepository<StudyGoalEntity, Long> {
    List<StudyGoalEntity> findByUserId(Long userId);

    void deleteByUserId(Long userId);

    List<StudyGoalEntity> findByCourseId(Long courseId);

    @Query("SELECT g.studyGoalTypeEnum, COUNT(g) FROM StudyGoalEntity g WHERE g.status = :status GROUP BY g.studyGoalTypeEnum")
    List<Object[]> countGoalsByTypeAndStatus(@Param("status") StudyGoalStatusEnum status);
}
