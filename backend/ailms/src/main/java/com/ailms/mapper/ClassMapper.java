package com.ailms.mapper;

import com.ailms.entity.ClassEntity;
import com.ailms.request.CreateClassRequest;
import com.ailms.request.UpdateClassRequest;
import com.ailms.response.ClassResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClassMapper {

    @Mapping(target = "courseId", source = "courseEntity.id")
    @Mapping(target = "courseName", source = "courseEntity.name")
    @Mapping(target = "categoryId", source = "categoryEntity.id")
    @Mapping(target = "categoryName", source = "categoryEntity.name")
    @Mapping(target = "teacherName", ignore = true)
    ClassResponse toResponse(ClassEntity entity);

    List<ClassResponse> toResponseList(List<ClassEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "categoryEntity", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "currentMemberCount", ignore = true)
    @Mapping(target = "code", ignore = true)
    ClassEntity toEntity(CreateClassRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "categoryEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "code", ignore = true)
    void updateFromRequest(UpdateClassRequest request, @MappingTarget ClassEntity entity);
}
