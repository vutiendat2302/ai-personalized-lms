package com.ailms.mapper;

import com.ailms.entity.StudyGoalEntity;
import com.ailms.request.CreateStudyGoalRequest;
import com.ailms.request.UpdateStudyGoalRequest;
import com.ailms.response.StudyGoalResponse;
import org.mapstruct.*;

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
    @Mapping(target = "status", ignore = true)
    StudyGoalEntity toEntity(CreateStudyGoalRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "userId", ignore = true)
    void updateFromRequest(UpdateStudyGoalRequest request, @MappingTarget StudyGoalEntity entity);
}
