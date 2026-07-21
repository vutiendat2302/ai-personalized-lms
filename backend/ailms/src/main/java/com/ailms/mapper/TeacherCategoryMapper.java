package com.ailms.mapper;

import com.ailms.entity.TeacherCategoryEntity;
import com.ailms.request.CreateTeacherCategoryRequest;
import com.ailms.request.UpdateTeacherCategoryRequest;
import com.ailms.response.TeacherCategoryResponse;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TeacherCategoryMapper {

    @Mapping(source = "employee.userId", target = "employeeId")
    @Mapping(source = "employee.userEntity.fullName", target = "employeeName")
    @Mapping(source = "employee.employeeCode", target = "employeeCode")
    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    TeacherCategoryResponse toResponse(TeacherCategoryEntity entity);

    List<TeacherCategoryResponse> toResponseList(List<TeacherCategoryEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "unassignedAt", ignore = true)
    TeacherCategoryEntity toEntity(CreateTeacherCategoryRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "employee", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "assignedBy", ignore = true)
    void update(UpdateTeacherCategoryRequest request, @MappingTarget TeacherCategoryEntity entity);
}
