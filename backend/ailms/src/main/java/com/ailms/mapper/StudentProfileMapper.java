package com.ailms.mapper;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.request.StudentProfileRequest;
import com.ailms.response.StudentProfileResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface StudentProfileMapper {

    StudentProfileResponse toResponse(StudentProfileEntity entity);

    List<StudentProfileResponse> toResponseList(List<StudentProfileEntity> list);

    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    StudentProfileEntity toEntity(StudentProfileRequest request);

    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(StudentProfileRequest request, @MappingTarget StudentProfileEntity entity);
}
