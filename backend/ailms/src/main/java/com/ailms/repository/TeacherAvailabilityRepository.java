package com.ailms.repository;

import com.ailms.entity.TeacherAvailabilityEntity;
import com.ailms.entity.enums.BaseStatusEnum;
import com.ailms.repository.base.BaseRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeacherAvailabilityRepository extends BaseRepository<TeacherAvailabilityEntity, Long> {

    List<TeacherAvailabilityEntity> findByEmployeeEntity_UserIdAndStatus(Long employeeId, BaseStatusEnum status);

    List<TeacherAvailabilityEntity> findByEmployeeEntity_UserIdInAndStatus(List<Long> employeeIds, BaseStatusEnum status);
}
