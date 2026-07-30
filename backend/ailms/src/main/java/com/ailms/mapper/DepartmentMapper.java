package com.ailms.mapper;

import com.ailms.entity.DepartmentEntity;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.request.CreateDepartmentRequest;
import com.ailms.request.UpdateDepartmentRequest;
import com.ailms.response.DepartmentResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface DepartmentMapper {


    DepartmentResponse toDepartmentResponse(DepartmentEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "employees", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "employeeCount", ignore = true)
    DepartmentEntity toDepartmentEntity(CreateDepartmentRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "employees", ignore = true)
    @Mapping(target = "employeeCount", ignore = true)
    void updateDepartmentEntity(@MappingTarget DepartmentEntity entity, UpdateDepartmentRequest request);

    @AfterMapping
    default void setEmployeeCount(DepartmentEntity entity, @MappingTarget DepartmentResponse response) {
        if (entity == null || entity.getEmployees() == null) {
            response.setEmployeeCount(0);
            return;
        }

        int count = (int) entity.getEmployees().stream()
                .filter(e -> e.getStatus() != EmployeeStatusEnum.TERMINATED)
                .filter(e -> e.getUserEntity() != null)
                .filter(e -> e.getUserEntity().getStatus() != UserStatusEnum.DELETED)
                .count();

        response.setEmployeeCount(count);
    }
}
