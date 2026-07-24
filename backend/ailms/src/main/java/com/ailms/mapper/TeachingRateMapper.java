package com.ailms.mapper;

import com.ailms.entity.TeachingRateEntity;
import com.ailms.request.CreateTeachingRateRequest;
import com.ailms.request.UpdateTeachingRateRequest;
import com.ailms.response.TeachingRateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeachingRateMapper {

    @Mapping(target = "employeeId", source = "employeeEntity.userId")
    @Mapping(target = "classId", source = "classEntity.id")
    TeachingRateResponse toResponse(TeachingRateEntity entity);

    List<TeachingRateResponse> toResponseList(List<TeachingRateEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employeeEntity", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "status", ignore = true)
    TeachingRateEntity toEntity(CreateTeachingRateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employeeEntity", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateTeachingRateRequest request, @MappingTarget TeachingRateEntity entity);
}
