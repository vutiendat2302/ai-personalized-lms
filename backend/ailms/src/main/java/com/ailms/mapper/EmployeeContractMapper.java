package com.ailms.mapper;

import com.ailms.entity.EmployeeContractEntity;
import com.ailms.request.EmployeeContractRequest;
import com.ailms.response.EmployeeContractResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface EmployeeContractMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    @Mapping(target = "fileUrl", expression = "java(entity.getFileMetadata() != null ? \"/api/v1/files/download?fileKey=\" + entity.getFileMetadata().getFileKey() : entity.getFileUrl())")
    EmployeeContractResponse toResponse(EmployeeContractEntity entity);

    List<EmployeeContractResponse> toResponseList(List<EmployeeContractEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    EmployeeContractEntity toEntity(EmployeeContractRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(EmployeeContractRequest request, @MappingTarget EmployeeContractEntity entity);
}
