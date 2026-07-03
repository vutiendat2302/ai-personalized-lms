package com.ailms.mapper;

import com.ailms.entity.PermissionEntity;
import com.ailms.request.PermissionRequest;
import com.ailms.response.PermissionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PermissionMapper {

    PermissionResponse toPermissionResponse(PermissionEntity entity);

    List<PermissionResponse> toPermissionResponseList(List<PermissionEntity> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    PermissionEntity toPermissionEntity(PermissionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updatePermissionFromRequest(PermissionRequest request, @MappingTarget PermissionEntity entity);
}