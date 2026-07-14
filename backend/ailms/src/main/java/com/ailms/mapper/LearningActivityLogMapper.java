package com.ailms.mapper;

import com.ailms.entity.LearningActivityLogEntity;
import com.ailms.request.LearningActivityLogRequest;
import com.ailms.response.LearningActivityLogResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LearningActivityLogMapper {

    LearningActivityLogResponse toResponse(LearningActivityLogEntity entity);

    List<LearningActivityLogResponse> toResponseList(List<LearningActivityLogEntity> list);

    @Mapping(target = "id", ignore = true)
    LearningActivityLogEntity toEntity(LearningActivityLogRequest request);

    @Mapping(target = "id", ignore = true)
    void updateFromRequest(LearningActivityLogRequest request, @MappingTarget LearningActivityLogEntity entity);
}
