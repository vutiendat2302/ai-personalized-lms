package com.ailms.mapper;

import com.ailms.entity.StudentInterestEntity;
import com.ailms.request.StudentInterestRequest;
import com.ailms.response.StudentInterestResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface StudentInterestMapper {

    @Mapping(target = "studentUserId", source = "id.studentUserId")
    @Mapping(target = "interestId", source = "id.interestId")
    @Mapping(target = "interestCode", source = "interest.code")
    @Mapping(target = "interestName", source = "interest.name")
    StudentInterestResponse toResponse(StudentInterestEntity entity);

    List<StudentInterestResponse> toResponseList(List<StudentInterestEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "studentProfile", ignore = true)
    @Mapping(target = "interest", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    StudentInterestEntity toEntity(StudentInterestRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "studentProfile", ignore = true)
    @Mapping(target = "interest", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(StudentInterestRequest request, @MappingTarget StudentInterestEntity entity);
}
