package com.ailms.mapper;

import com.ailms.entity.QuizEntity;
import com.ailms.request.QuizRequest;
import com.ailms.response.QuizResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface QuizMapper {

    @Mapping(target = "questions", ignore = true)
    QuizResponse toResponse(QuizEntity entity);

    List<QuizResponse> toResponseList(List<QuizEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    QuizEntity toEntity(QuizRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(QuizRequest request, @MappingTarget QuizEntity entity);
}
