package com.ailms.mapper;

import com.ailms.entity.EmployeeContractEntity;
import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.UpdateEmployeeContractRequest;
import com.ailms.response.EmployeeContractResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface EmployeeContractMapper {

    @Mapping(target = "employeeId", source = "employee.userId")
    @Mapping(target = "fullName", source = "employee.userEntity.fullName")
    @Mapping(target = "avatarUrl", source = "employee.userEntity.avatarUrl")
    @Mapping(target = "employeeCode", source = "employee.employeeCode")
    @Mapping(target = "departmentName", source = "employee.department.name")
    @Mapping(target = "position", source = "employee.position")
    @Mapping(target = "fileKey", expression = "java(entity.getFileMetadata() != null ? \"/api/v1/files/download?fileKey=\" + entity.getFileMetadata().getFileKey() : null)")
    @Mapping(target = "fileName", source = "fileMetadata.originalName")
    @Mapping(target = "fileSize", source = "fileMetadata.fileSize")
    @Mapping(target = "originalFileMetadataId", source = "originalFileMetadata.id")
    @Mapping(target = "downloadUrl", ignore = true)
    @Mapping(target = "originalFileDownloadUrl", ignore = true)
    EmployeeContractResponse toResponse(EmployeeContractEntity entity);

    List<EmployeeContractResponse> toResponseList(List<EmployeeContractEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "fileMetadata", ignore = true)
    @Mapping(target = "originalFileMetadata", ignore = true)
    @Mapping(target = "fileKey", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "signingStatus", ignore = true)
    @Mapping(target = "signingToken", ignore = true)
    @Mapping(target = "signingTokenExpiresAt", ignore = true)
    @Mapping(target = "terminatedAt", ignore = true)
    @Mapping(target = "terminationReason", ignore = true)
    EmployeeContractEntity toEntity(CreateEmployeeContractRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "fileMetadata", ignore = true)
    @Mapping(target = "originalFileMetadata", ignore = true)
    @Mapping(target = "contractTypeEnum", ignore = true)
    @Mapping(target = "signedAt", ignore = true)
    @Mapping(target = "fileKey", ignore = true)
    @Mapping(target = "signingStatus", ignore = true)
    @Mapping(target = "signingToken", ignore = true)
    @Mapping(target = "signingTokenExpiresAt", ignore = true)
    @Mapping(target = "terminatedAt", ignore = true)
    @Mapping(target = "terminationReason", ignore = true)
    void updateFromRequest(UpdateEmployeeContractRequest request, @MappingTarget EmployeeContractEntity entity);
}
