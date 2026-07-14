package com.ailms.mapper;

import com.ailms.entity.StudyGoalEntity;
import com.ailms.request.StudyGoalRequest;
import com.ailms.response.StudyGoalResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface StudyGoalMapper {

    StudyGoalResponse toResponse(StudyGoalEntity entity);

    List<StudyGoalResponse> toResponseList(List<StudyGoalEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    StudyGoalEntity toEntity(StudyGoalRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(StudyGoalRequest request, @MappingTarget StudyGoalEntity entity);
}
