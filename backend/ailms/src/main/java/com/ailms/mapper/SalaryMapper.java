package com.ailms.mapper;

import com.ailms.entity.SalaryEntity;
import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.SalaryResponse;
import org.mapstruct.*;

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
    SalaryEntity toEntity(CreateSalaryRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "baseSalary", ignore = true)
    @Mapping(target = "salaryTypeEnum", ignore = true)
    void updateFromRequest(UpdateSalaryRequest request, @MappingTarget SalaryEntity entity);
}
