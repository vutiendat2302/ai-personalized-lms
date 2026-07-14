package com.ailms.mapper;

import com.ailms.entity.ClassEntity;
import com.ailms.request.ClassRequest;
import com.ailms.response.ClassResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClassMapper {

    @Mapping(target = "courseId", source = "courseEntity.id")
    ClassResponse toResponse(ClassEntity entity);

    List<ClassResponse> toResponseList(List<ClassEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    ClassEntity toEntity(ClassRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(ClassRequest request, @MappingTarget ClassEntity entity);
}
