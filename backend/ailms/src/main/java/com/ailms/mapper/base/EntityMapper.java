package com.ailms.mapper.base;

import org.mapstruct.MappingTarget;

public interface EntityMapper<T, CreateDto, UpdateDto, ResponseDto> {
    T toEntity(CreateDto dto);
    ResponseDto toResponse(T entity);
    void updateEntity(UpdateDto dto, @MappingTarget T entity);
}
