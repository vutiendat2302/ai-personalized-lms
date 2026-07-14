package com.ailms.mapper;

import com.ailms.entity.QuizAnswerEntity;
import com.ailms.request.QuizAnswerRequest;
import com.ailms.response.QuizAnswerResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface QuizAnswerMapper {

    QuizAnswerResponse toResponse(QuizAnswerEntity entity);

    List<QuizAnswerResponse> toResponseList(List<QuizAnswerEntity> list);

    @Mapping(target = "id", ignore = true)
    QuizAnswerEntity toEntity(QuizAnswerRequest request);

    @Mapping(target = "id", ignore = true)
    void updateFromRequest(QuizAnswerRequest request, @MappingTarget QuizAnswerEntity entity);
}
