package com.ailms.mapper;

import com.ailms.entity.ReviewEntity;
import com.ailms.response.ReviewResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ReviewMapper {

    @Mapping(target = "courseName", source = "courseEntity.name")
    @Mapping(target = "userName", source = "userEntity.fullName")
    @Mapping(target = "avatarUrl", source = "userEntity.avatarUrl")
    @Mapping(target = "schoolName", ignore = true)
    @Mapping(target = "teacherName", ignore = true)
    @Mapping(target = "teacherAvatarUrl", ignore = true)
    ReviewResponse toResponse(ReviewEntity entity);

    List<ReviewResponse> toResponseList(List<ReviewEntity> list);
}
