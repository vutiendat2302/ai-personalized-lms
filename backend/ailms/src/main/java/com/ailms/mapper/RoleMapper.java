package com.ailms.mapper;

import com.ailms.entity.RoleEntity;
import com.ailms.request.RoleRequest;
import com.ailms.response.RoleResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface RoleMapper {

    RoleResponse toRoleResponse(RoleEntity roleEntity);

    List<RoleResponse> toRoleResponseList(List<RoleEntity> roleEntities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "isSystem", constant = "false")
    @Mapping(target = "rolePermissions", ignore = true)
    RoleEntity toRoleEntity(RoleRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "isSystem", ignore = true)
    @Mapping(target = "rolePermissions", ignore = true)
    void updateRoleFromRequest(RoleRequest request, @MappingTarget RoleEntity entity);
}
