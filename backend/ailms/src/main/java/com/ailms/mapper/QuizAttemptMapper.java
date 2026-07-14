package com.ailms.mapper;

import com.ailms.entity.QuizAttemptEntity;
import com.ailms.request.QuizAttemptRequest;
import com.ailms.response.QuizAttemptResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface QuizAttemptMapper {

    QuizAttemptResponse toResponse(QuizAttemptEntity entity);

    List<QuizAttemptResponse> toResponseList(List<QuizAttemptEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    QuizAttemptEntity toEntity(QuizAttemptRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(QuizAttemptRequest request, @MappingTarget QuizAttemptEntity entity);
}
