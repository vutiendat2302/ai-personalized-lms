package com.ailms.mapper;

import com.ailms.entity.SubmissionEntity;
import com.ailms.request.SubmissionRequest;
import com.ailms.response.SubmissionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SubmissionMapper {

    @Mapping(target = "fileUrl", expression = "java(entity.getFileMetadata() != null ? \"/api/v1/files/download?fileKey=\" + entity.getFileMetadata().getFileKey() : entity.getFileUrl())")
    SubmissionResponse toResponse(SubmissionEntity entity);

    List<SubmissionResponse> toResponseList(List<SubmissionEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    SubmissionEntity toEntity(SubmissionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(SubmissionRequest request, @MappingTarget SubmissionEntity entity);
}
