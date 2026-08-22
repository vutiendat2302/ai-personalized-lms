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

    @Mapping(target = "id", source = "userId")
    @Mapping(target = "fullName", source = "userEntity.fullName")
    @Mapping(target = "email", source = "userEntity.email")
    @Mapping(target = "phone", source = "userEntity.phone")
    @Mapping(target = "avatarUrl", source = "userEntity.avatarUrl")
    @Mapping(target = "gender", source = "userEntity.gender")
    @Mapping(target = "dateOfBirth", source = "userEntity.dateOfBirth")
    @Mapping(target = "status", expression = "java(entity.getUserEntity() != null && entity.getUserEntity().getStatus() != null ? entity.getUserEntity().getStatus().name() : null)")
    @Mapping(target = "lastActiveAt", ignore = true)
    @Mapping(target = "enrolledCourseName", ignore = true)
    @Mapping(target = "hasGuardian", ignore = true)
    @Mapping(target = "goalTypes", ignore = true)
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
    @Mapping(target = "currentStreak", ignore = true)
    @Mapping(target = "longestStreak", ignore = true)
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
    @Mapping(target = "currentStreak", ignore = true)
    @Mapping(target = "longestStreak", ignore = true)
    void updateFromRequest(UpdateStudentProfileRequest request, @MappingTarget StudentProfileEntity entity);
}
