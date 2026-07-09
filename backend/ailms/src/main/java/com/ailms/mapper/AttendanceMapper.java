package com.ailms.mapper;

import com.ailms.entity.AttendanceEntity;
import com.ailms.request.AttendanceRequest;
import com.ailms.response.AttendanceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AttendanceMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    AttendanceResponse toResponse(AttendanceEntity entity);

    List<AttendanceResponse> toResponseList(List<AttendanceEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    AttendanceEntity toEntity(AttendanceRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(AttendanceRequest request, @MappingTarget AttendanceEntity entity);
}
