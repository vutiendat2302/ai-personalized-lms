package com.ailms.mapper;

import com.ailms.entity.LessonResourceEntity;
import com.ailms.request.CreateResourceRequest;
import com.ailms.request.UpdateResourceRequest;
import com.ailms.response.ResourceResponse;
import com.ailms.service.IFileService;
import org.mapstruct.*;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring")
public interface LessonResourceMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "lessonEntity", ignore = true)
    @Mapping(target = "fileMetadata", ignore = true)
    LessonResourceEntity toEntity(CreateResourceRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "lessonEntity", ignore = true)
    @Mapping(target = "fileMetadata", ignore = true)
    void updateEntityFromRequest(UpdateResourceRequest request, @MappingTarget LessonResourceEntity entity);

    @Mapping(target = "lessonId", source = "lessonEntity.id")
    @Mapping(target = "fileUrl", source = "fileMetadata.fileKey")
    @Mapping(target = "fileType", source = "fileMetadata.contentType")
    @Mapping(target = "fileSize", source = "fileMetadata.fileSize")
    ResourceResponse toResponse(LessonResourceEntity entity);

}