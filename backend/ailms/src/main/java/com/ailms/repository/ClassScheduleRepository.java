package com.ailms.repository;

import com.ailms.entity.ClassScheduleEntity;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassScheduleRepository extends BaseRepository<ClassScheduleEntity, Long> {

    List<ClassScheduleEntity> findByClassEntity_Id(Long classId);

    List<ClassScheduleEntity> findByClassEntity_IdIn(List<Long> classIds);
}
