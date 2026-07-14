package com.ailms.mapper;

import com.ailms.entity.CourseTeacherEntity;
import com.ailms.request.CourseTeacherRequest;
import com.ailms.response.CourseTeacherResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CourseTeacherMapper {

    @Mapping(target = "courseId", source = "id.courseId")
    @Mapping(target = "userId", source = "id.userId")
    CourseTeacherResponse toResponse(CourseTeacherEntity entity);

    List<CourseTeacherResponse> toResponseList(List<CourseTeacherEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    CourseTeacherEntity toEntity(CourseTeacherRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    void updateFromRequest(CourseTeacherRequest request, @MappingTarget CourseTeacherEntity entity);
}
