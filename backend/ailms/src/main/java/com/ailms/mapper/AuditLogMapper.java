package com.ailms.mapper;

import com.ailms.entity.AuditLogEntity;
import com.ailms.response.AuditLogResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AuditLogMapper {
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "userFullName", source = "user.fullName")
    AuditLogResponse toResponse(AuditLogEntity entity);

    List<AuditLogResponse> toResponseList(List<AuditLogEntity> entities);
}
