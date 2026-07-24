package com.ailms.mapper;

import com.ailms.entity.DegreeEntity;
import com.ailms.response.DegreeResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DegreeMapper {

    @Mapping(target = "categoryId", source = "categoryEntity.id")
    @Mapping(target = "categoryName", source = "categoryEntity.name")
    DegreeResponse toResponse(DegreeEntity entity);
}
