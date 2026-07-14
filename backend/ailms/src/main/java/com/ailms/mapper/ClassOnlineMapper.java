package com.ailms.mapper;

import com.ailms.entity.ClassOnlineEntity;
import com.ailms.request.ClassOnlineRequest;
import com.ailms.response.ClassOnlineResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClassOnlineMapper {

    @Mapping(target = "classId", source = "classEntity.id")
    @Mapping(target = "teacherId", source = "teacherEntity.id")
    ClassOnlineResponse toResponse(ClassOnlineEntity entity);

    List<ClassOnlineResponse> toResponseList(List<ClassOnlineEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "teacherEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    ClassOnlineEntity toEntity(ClassOnlineRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "teacherEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(ClassOnlineRequest request, @MappingTarget ClassOnlineEntity entity);
}
