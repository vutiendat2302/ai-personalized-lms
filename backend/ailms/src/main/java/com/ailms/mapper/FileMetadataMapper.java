package com.ailms.mapper;

import com.ailms.entity.FileMetadataEntity;
import com.ailms.request.CreateFileMetadataRequest;
import com.ailms.response.FileMetadataResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface FileMetadataMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    FileMetadataEntity toEntity(CreateFileMetadataRequest request);

    FileMetadataResponse toResponse(FileMetadataEntity entity);

    List<FileMetadataResponse> toResponseList(List<FileMetadataEntity> list);
}
