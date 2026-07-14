package com.ailms.mapper;

import com.ailms.entity.DepartmentEntity;
import com.ailms.request.CreateDepartmentRequest;
import com.ailms.request.UpdateDepartmentRequest;
import com.ailms.response.DepartmentResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface DepartmentMapper {

    @Mapping(source = "parent.id", target = "parentId")
    @Mapping(source = "parent.name", target = "parentName")
    DepartmentResponse toDepartmentResponse(DepartmentEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "parent", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "children", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    DepartmentEntity toDepartmentEntity(CreateDepartmentRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "parent", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "children", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateDepartmentEntity(@MappingTarget DepartmentEntity entity, UpdateDepartmentRequest request);
}
