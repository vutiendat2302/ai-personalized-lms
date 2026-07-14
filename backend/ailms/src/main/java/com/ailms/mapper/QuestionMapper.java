package com.ailms.mapper;

import com.ailms.entity.QuestionEntity;
import com.ailms.request.QuestionRequest;
import com.ailms.response.QuestionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface QuestionMapper {

    QuestionResponse toResponse(QuestionEntity entity);

    List<QuestionResponse> toResponseList(List<QuestionEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    QuestionEntity toEntity(QuestionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(QuestionRequest request, @MappingTarget QuestionEntity entity);
}
