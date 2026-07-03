package com.ailms.mapper;

import com.ailms.entity.RoleEntity;
import com.ailms.request.RoleRequest;
import com.ailms.response.RoleResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

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
    @Mapping(target = "rolePermissions", ignore = true)
    @Mapping(target = "isSystem", ignore = true)
    RoleEntity toRoleEntity(RoleRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "rolePermissions", ignore = true)
    void updateRoleFromRequest(RoleRequest request, @MappingTarget RoleEntity entity);
}