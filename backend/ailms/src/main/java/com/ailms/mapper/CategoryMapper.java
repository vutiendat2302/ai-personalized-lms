package com.ailms.mapper;


import com.ailms.entity.CategoryEntity;
import com.ailms.mapper.base.EntityMapper;
import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.CategoryResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface CategoryMapper extends EntityMapper<CategoryEntity, CreateCategoryRequest, UpdateCategoryRequest, CategoryResponse> {

    @Override
    CategoryResponse toResponse(CategoryEntity entity);

    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "courses", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    CategoryEntity toEntity(CreateCategoryRequest request);

    @Override
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "courses", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateEntity(UpdateCategoryRequest request, @MappingTarget CategoryEntity entity);
}
