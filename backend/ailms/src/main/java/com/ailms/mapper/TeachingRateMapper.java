package com.ailms.mapper;

import com.ailms.entity.TeachingRateEntity;
import com.ailms.request.TeachingRateRequest;
import com.ailms.response.TeachingRateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeachingRateMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    TeachingRateResponse toResponse(TeachingRateEntity entity);

    List<TeachingRateResponse> toResponseList(List<TeachingRateEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    TeachingRateEntity toEntity(TeachingRateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(TeachingRateRequest request, @MappingTarget TeachingRateEntity entity);
}
