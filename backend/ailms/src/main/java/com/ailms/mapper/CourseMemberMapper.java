package com.ailms.mapper;

import com.ailms.entity.CourseMemberEntity;
import com.ailms.request.CourseMemberRequest;
import com.ailms.response.CourseMemberResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CourseMemberMapper {

    @Mapping(target = "courseId", source = "id.courseId")
    @Mapping(target = "userId", source = "id.userId")
    CourseMemberResponse toResponse(CourseMemberEntity entity);

    List<CourseMemberResponse> toResponseList(List<CourseMemberEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    CourseMemberEntity toEntity(CourseMemberRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "userEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(CourseMemberRequest request, @MappingTarget CourseMemberEntity entity);
}
