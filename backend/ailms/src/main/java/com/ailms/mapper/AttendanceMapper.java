package com.ailms.mapper;

import com.ailms.entity.AttendanceEntity;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.AttendanceResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AttendanceMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    @Mapping(target = "employeeName", source = "employee.userEntity.fullName")
    @Mapping(target = "employeeCode", source = "employee.employeeCode")
    @Mapping(target = "departmentName", source = "employee.department.name")
    @Mapping(target = "avatarUrl", source = "employee.userEntity.avatarUrl")
    @Mapping(target = "workShiftId", source = "workShift.id")
    @Mapping(target = "workShiftName", source = "workShift.name")
    @Mapping(target = "approvedByName", ignore = true)
    AttendanceResponse toResponse(AttendanceEntity entity);

    List<AttendanceResponse> toResponseList(List<AttendanceEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "workShift", ignore = true)
    @Mapping(target = "workDate", ignore = true)
    @Mapping(target = "workedMinutes", ignore = true)
    @Mapping(target = "lateMinutes", ignore = true)
    @Mapping(target = "earlyLeaveMinutes", ignore = true)
    @Mapping(target = "overtimeMinutes", ignore = true)
    @Mapping(target = "source", ignore = true)
    @Mapping(target = "approvedBy", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "status", ignore = true)
    AttendanceEntity toEntity(CreateAttendanceRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "workShift", ignore = true)
    @Mapping(target = "workedMinutes", ignore = true)
    @Mapping(target = "lateMinutes", ignore = true)
    @Mapping(target = "earlyLeaveMinutes", ignore = true)
    @Mapping(target = "overtimeMinutes", ignore = true)
    @Mapping(target = "source", ignore = true)
    @Mapping(target = "approvedBy", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateAttendanceRequest request, @MappingTarget AttendanceEntity entity);
}
