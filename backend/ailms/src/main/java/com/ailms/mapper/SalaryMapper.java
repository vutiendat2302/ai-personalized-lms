package com.ailms.mapper;

import com.ailms.entity.SalaryEntity;
import com.ailms.request.SalaryRequest;
import com.ailms.response.SalaryResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SalaryMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    SalaryResponse toResponse(SalaryEntity entity);

    List<SalaryResponse> toResponseList(List<SalaryEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    SalaryEntity toEntity(SalaryRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(SalaryRequest request, @MappingTarget SalaryEntity entity);
}
