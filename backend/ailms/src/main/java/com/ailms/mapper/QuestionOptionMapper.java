package com.ailms.mapper;

import com.ailms.entity.QuestionOptionEntity;
import com.ailms.request.QuestionOptionRequest;
import com.ailms.response.QuestionOptionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface QuestionOptionMapper {

    QuestionOptionResponse toResponse(QuestionOptionEntity entity);

    List<QuestionOptionResponse> toResponseList(List<QuestionOptionEntity> list);

    @Mapping(target = "id", ignore = true)
    QuestionOptionEntity toEntity(QuestionOptionRequest request);

    @Mapping(target = "id", ignore = true)
    void updateFromRequest(QuestionOptionRequest request, @MappingTarget QuestionOptionEntity entity);
}
