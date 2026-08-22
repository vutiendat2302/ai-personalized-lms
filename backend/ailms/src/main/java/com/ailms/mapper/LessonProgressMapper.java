package com.ailms.mapper;

import com.ailms.entity.LessonProgressEntity;
import com.ailms.request.LessonProgressRequest;
import com.ailms.response.LessonProgressResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LessonProgressMapper {

    LessonProgressResponse toResponse(LessonProgressEntity entity);

    List<LessonProgressResponse> toResponseList(List<LessonProgressEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    LessonProgressEntity toEntity(LessonProgressRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(LessonProgressRequest request, @MappingTarget LessonProgressEntity entity);
}
