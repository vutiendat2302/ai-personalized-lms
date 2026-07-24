package com.ailms.mapper;

import com.ailms.entity.CourseProgressEntity;
import com.ailms.request.CourseProgressRequest;
import com.ailms.response.CourseProgressResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CourseProgressMapper {

    CourseProgressResponse toResponse(CourseProgressEntity entity);

    List<CourseProgressResponse> toResponseList(List<CourseProgressEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    CourseProgressEntity toEntity(CourseProgressRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(CourseProgressRequest request, @MappingTarget CourseProgressEntity entity);
}
