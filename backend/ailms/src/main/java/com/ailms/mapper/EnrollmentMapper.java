package com.ailms.mapper;

import com.ailms.entity.EnrollmentEntity;
import com.ailms.request.EnrollmentRequest;
import com.ailms.response.EnrollmentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface EnrollmentMapper {

    @Mapping(target = "userId", source = "userEntity.id")
    @Mapping(target = "courseId", source = "courseEntity.id")
    @Mapping(target = "classId", source = "classEntity.id")
    EnrollmentResponse toResponse(EnrollmentEntity entity);

    List<EnrollmentResponse> toResponseList(List<EnrollmentEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    EnrollmentEntity toEntity(EnrollmentRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(EnrollmentRequest request, @MappingTarget EnrollmentEntity entity);
}
