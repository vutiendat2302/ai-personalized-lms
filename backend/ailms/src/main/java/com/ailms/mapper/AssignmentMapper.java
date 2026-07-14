package com.ailms.mapper;

import com.ailms.entity.AssignmentEntity;
import com.ailms.request.AssignmentRequest;
import com.ailms.response.AssignmentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AssignmentMapper {

    AssignmentResponse toResponse(AssignmentEntity entity);

    List<AssignmentResponse> toResponseList(List<AssignmentEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    AssignmentEntity toEntity(AssignmentRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(AssignmentRequest request, @MappingTarget AssignmentEntity entity);
}
