package com.ailms.mapper;

import com.ailms.entity.LearningSessionEntity;
import com.ailms.response.LearningSessionResponse;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface LearningSessionMapper {

    LearningSessionResponse toResponse(LearningSessionEntity entity);

    List<LearningSessionResponse> toResponseList(List<LearningSessionEntity> list);
}
