package com.ailms.mapper;

import com.ailms.entity.LessonEntity;
import com.ailms.request.CreateLessonRequest;
import com.ailms.request.UpdateLessonRequest;
import com.ailms.response.LessonResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface LessonMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "courseSectionEntity", ignore = true)
    @Mapping(target = "resources", ignore = true)
    LessonEntity toEntity(CreateLessonRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "courseSectionEntity", ignore = true)
    @Mapping(target = "resources", ignore = true)
    void updateEntityFromRequest(UpdateLessonRequest request, @MappingTarget LessonEntity entity);

    @Mapping(target = "sectionId", source = "courseSectionEntity.id")
    LessonResponse toResponse(LessonEntity entity);

}