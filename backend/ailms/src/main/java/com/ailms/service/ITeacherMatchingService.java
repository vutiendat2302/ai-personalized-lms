package com.ailms.service;

import com.ailms.entity.EmployeeEntity;
import com.ailms.request.CreateGroupClassRequest;

import java.util.List;
import java.util.Optional;

public interface ITeacherMatchingService {

    boolean checkScheduleCollision(Long teacherEmployeeId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots);

    Optional<EmployeeEntity> matchTeacherFor1on1(Long categoryId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots);

    Optional<EmployeeEntity> matchTeacherForGroupClass(Long categoryId, List<CreateGroupClassRequest.ScheduleSlotRequest> requestedSlots);
}
