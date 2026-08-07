package com.ailms.mapper;

import com.ailms.entity.SalaryDetailEntity;
import com.ailms.entity.SalaryEntity;
import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.SalaryDetailResponse;
import com.ailms.response.SalaryResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SalaryMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    @Mapping(target = "employeeName", source = "employee.userEntity.fullName")
    @Mapping(target = "employeeCode", source = "employee.employeeCode")
    @Mapping(target = "departmentName", source = "employee.department.name")
    @Mapping(target = "avatarUrl", source = "employee.userEntity.avatarUrl")
    @Mapping(target = "details", source = "details")
    SalaryResponse toResponse(SalaryEntity entity);

    SalaryDetailResponse toDetailResponse(SalaryDetailEntity entity);

    List<SalaryDetailResponse> toDetailResponseList(List<SalaryDetailEntity> list);

    List<SalaryResponse> toResponseList(List<SalaryEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "baseSalary", ignore = true)
    @Mapping(target = "salaryTypeEnum", ignore = true)
    @Mapping(target = "totalSalary", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "paidAt", ignore = true)
    @Mapping(target = "transferExportedAt", ignore = true)
    @Mapping(target = "submittedAt", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "details", ignore = true)
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
    @Mapping(target = "transferExportedAt", ignore = true)
    @Mapping(target = "submittedAt", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "details", ignore = true)
    void updateFromRequest(UpdateSalaryRequest request, @MappingTarget SalaryEntity entity);
}
