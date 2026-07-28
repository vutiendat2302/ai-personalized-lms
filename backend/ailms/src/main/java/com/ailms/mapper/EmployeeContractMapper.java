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
    @Mapping(target = "fileKey", expression = "java(entity.getFileMetadata() != null ? \"/api/v1/files/download?fileKey=\" + entity.getFileMetadata().getFileKey() : null)")
    @Mapping(target = "fileName", source = "fileMetadata.originalName")
    @Mapping(target = "fileSize", source = "fileMetadata.fileSize")
    EmployeeContractResponse toResponse(EmployeeContractEntity entity);

    List<EmployeeContractResponse> toResponseList(List<EmployeeContractEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "fileMetadata", ignore = true)
    EmployeeContractEntity toEntity(CreateEmployeeContractRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "fileMetadata", ignore = true)
    @Mapping(target = "contractTypeEnum", ignore = true)
    @Mapping(target = "signedAt", ignore = true)
    @Mapping(target = "fileKey", ignore = true)
    void updateFromRequest(UpdateEmployeeContractRequest request, @MappingTarget EmployeeContractEntity entity);
}
