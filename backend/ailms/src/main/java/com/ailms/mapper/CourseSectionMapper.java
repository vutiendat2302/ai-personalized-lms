package com.ailms.mapper;

import com.ailms.entity.CourseSectionEntity;
import com.ailms.request.CreateSectionRequest;
import com.ailms.request.UpdateSectionRequest;
import com.ailms.response.SectionResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface CourseSectionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "lessonEntities", ignore = true)
    CourseSectionEntity toEntity(CreateSectionRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "lessonEntities", ignore = true)
    void updateEntityFromRequest(UpdateSectionRequest request, @MappingTarget CourseSectionEntity entity);

    @Mapping(target = "courseId", source = "courseEntity.id")
    @Mapping(target = "courseName", source = "courseEntity.name")
    SectionResponse toResponse(CourseSectionEntity entity);

}