package com.ailms.mapper;

import com.ailms.entity.ClassScheduleEntity;
import com.ailms.response.ClassScheduleResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClassScheduleMapper {

    @Mapping(target = "classId", source = "classEntity.id")
    ClassScheduleResponse toResponse(ClassScheduleEntity entity);

    List<ClassScheduleResponse> toResponseList(List<ClassScheduleEntity> list);
}
