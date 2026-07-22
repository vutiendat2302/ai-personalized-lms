package com.ailms.mapper;

import com.ailms.entity.ClassOnlineEntity;
import com.ailms.request.CreateClassOnlineRequest;
import com.ailms.request.UpdateClassOnlineRequest;
import com.ailms.response.ClassOnlineResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClassOnlineMapper {

    @Mapping(target = "classId", source = "classEntity.id")
    @Mapping(target = "teacherId", source = "teacherEntity.id")
    ClassOnlineResponse toResponse(ClassOnlineEntity entity);

    List<ClassOnlineResponse> toResponseList(List<ClassOnlineEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "teacherEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    ClassOnlineEntity toEntity(CreateClassOnlineRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "teacherEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateClassOnlineRequest request, @MappingTarget ClassOnlineEntity entity);
}
