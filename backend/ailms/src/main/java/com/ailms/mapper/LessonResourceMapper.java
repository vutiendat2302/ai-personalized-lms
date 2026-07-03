package com.ailms.mapper;

import com.ailms.entity.LessonResourceEntity;
import com.ailms.request.CreateResourceRequest;
import com.ailms.request.UpdateResourceRequest;
import com.ailms.response.ResourceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface LessonResourceMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "lessonEntity", ignore = true)
    LessonResourceEntity toEntity(CreateResourceRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "lessonEntity", ignore = true)
    void updateEntityFromRequest(UpdateResourceRequest request, @MappingTarget LessonResourceEntity entity);

    @Mapping(target = "lessonId", source = "lessonEntity.id")
    ResourceResponse toResponse(LessonResourceEntity entity);

}