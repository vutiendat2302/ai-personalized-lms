package com.ailms.mapper;

import com.ailms.entity.EmployeeEntity;
import com.ailms.request.EmployeeRequest;
import com.ailms.response.EmployeeResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface EmployeeMapper {

    @Mapping(source = "department.id", target = "departmentId")
    @Mapping(source = "department.name", target = "departmentName")
    EmployeeResponse toResponse(EmployeeEntity entity);

    List<EmployeeResponse> toResponseList(List<EmployeeEntity> list);

    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "department", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    EmployeeEntity toEntity(EmployeeRequest request);

    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "department", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(EmployeeRequest request, @MappingTarget EmployeeEntity entity);
}
