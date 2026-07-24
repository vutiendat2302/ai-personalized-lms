package com.ailms.mapper;

import com.ailms.entity.SearchHistoryEntity;
import com.ailms.response.SearchHistoryResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SearchHistoryMapper {

    @Mapping(target = "courseId", source = "course.id")
    @Mapping(target = "courseName", source = "course.name")
    SearchHistoryResponse toResponse(SearchHistoryEntity entity);
}
