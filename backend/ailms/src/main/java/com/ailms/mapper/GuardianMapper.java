package com.ailms.mapper;

import com.ailms.entity.GuardianEntity;
import com.ailms.request.GuardianRequest;
import com.ailms.response.GuardianResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface GuardianMapper {

    @Mapping(target = "studentUserId", source = "studentProfile.userId")
    GuardianResponse toResponse(GuardianEntity entity);

    List<GuardianResponse> toResponseList(List<GuardianEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "studentProfile", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    GuardianEntity toEntity(GuardianRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "studentProfile", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(GuardianRequest request, @MappingTarget GuardianEntity entity);
}
