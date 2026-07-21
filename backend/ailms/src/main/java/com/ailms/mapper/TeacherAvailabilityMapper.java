package com.ailms.mapper;

import com.ailms.entity.TeacherAvailabilityEntity;
import com.ailms.request.TeacherAvailabilityRequest;
import com.ailms.request.UpdateTeacherAvailabilityRequest;
import com.ailms.response.TeacherAvailabilityResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeacherAvailabilityMapper {

    @Mapping(source = "employeeEntity.userId", target = "employeeId")
    @Mapping(source = "employeeEntity.employeeCode", target = "employeeCode")
    @Mapping(source = "employeeEntity.userEntity.fullName", target = "employeeName")
    TeacherAvailabilityResponse toResponse(TeacherAvailabilityEntity entity);

    List<TeacherAvailabilityResponse> toResponseList(List<TeacherAvailabilityEntity> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employeeEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "status", ignore = true)
    TeacherAvailabilityEntity toEntity(TeacherAvailabilityRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employeeEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateTeacherAvailabilityRequest request, @MappingTarget TeacherAvailabilityEntity entity);
}
