package com.ailms.mapper;

import com.ailms.entity.NotificationEntity;
import com.ailms.response.NotificationResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "createdById", source = "createdByAdmin.id")
    @Mapping(target = "createdByName", source = "createdByAdmin.fullName")
    @Mapping(target = "isRead", expression = "java(entity.isRead())")
    NotificationResponse toResponse(NotificationEntity entity);
}
