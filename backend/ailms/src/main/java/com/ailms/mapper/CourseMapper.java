package com.ailms.mapper;

import com.ailms.entity.CourseEntity;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.CourseResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    @Mapping(target = "categoryEntity.id", source = "categoryId")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "sections", ignore = true)
    CourseEntity toEntity(CreateCourseRequest request);


    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "categoryEntity.id", source = "categoryId")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "sections", ignore = true)
    void updateEntityFromRequest(UpdateCourseRequest request, @MappingTarget CourseEntity entity);

    @Mapping(target = "categoryId", source = "categoryEntity.id")
    @Mapping(target = "categoryName", source = "categoryEntity.name")



    CourseResponse toResponse(CourseEntity entity);


}