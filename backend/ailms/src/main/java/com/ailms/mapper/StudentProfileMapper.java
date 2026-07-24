package com.ailms.mapper;

import com.ailms.entity.StudentProfileEntity;
import com.ailms.request.CreateStudentProfileRequest;
import com.ailms.request.UpdateStudentProfileRequest;
import com.ailms.response.StudentProfileResponse;
import org.mapstruct.*;

import javax.annotation.Nullable;
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
    @Mapping(target = "studentInterests", ignore = true)
    @Mapping(target = "hasGoal", ignore = true)
    @Mapping(target = "isMinor", ignore = true)
    @Mapping(target = "studentCode", ignore = true)
    StudentProfileEntity toEntity(CreateStudentProfileRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "studentInterests", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "isMinor", ignore = true)
    @Mapping(target = "studentCode", ignore = true)
    @Mapping(target = "hasGoal", ignore = true)
    void updateFromRequest(UpdateStudentProfileRequest request, @MappingTarget StudentProfileEntity entity);
}
