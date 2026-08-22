package com.ailms.mapper;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.request.CreateLearningActivityLogRequest;
import com.ailms.response.LearningActivityLogResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LearningActivityLogMapper {

    @Mapping(target = "entityName", ignore = true)
    @Mapping(target = "courseId", ignore = true)
    @Mapping(target = "courseName", ignore = true)
    @Mapping(target = "className", ignore = true)
    LearningActivityLogResponse toResponse(LearningActivityLogEntity entity);

    List<LearningActivityLogResponse> toResponseList(List<LearningActivityLogEntity> list);

    @Mapping(target = "id", ignore = true)
    LearningActivityLogEntity toEntity(CreateLearningActivityLogRequest request);
}
