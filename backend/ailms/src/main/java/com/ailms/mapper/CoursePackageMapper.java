package com.ailms.mapper;

import com.ailms.entity.CoursePackageEntity;
import com.ailms.request.CoursePackageRequest;
import com.ailms.response.CoursePackageResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CoursePackageMapper {

    @Mapping(target = "courseId", source = "courseEntity.id")
    @Mapping(target = "courseName", source = "courseEntity.name")
    CoursePackageResponse toResponse(CoursePackageEntity entity);

    List<CoursePackageResponse> toResponseList(List<CoursePackageEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    CoursePackageEntity toEntity(CoursePackageRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(CoursePackageRequest request, @MappingTarget CoursePackageEntity entity);
}
