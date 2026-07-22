package com.ailms.mapper;

import com.ailms.entity.CouponEntity;
import com.ailms.request.CouponRequest;
import com.ailms.response.CouponResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CouponMapper {

    @Mapping(target = "applicableCourseId", source = "applicableCourseEntity.id")
    @Mapping(target = "applicableCourseName", source = "applicableCourseEntity.name")
    CouponResponse toResponse(CouponEntity entity);

    List<CouponResponse> toResponseList(List<CouponEntity> list);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "applicableCourseEntity", ignore = true)
    @Mapping(target = "usedCount", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    CouponEntity toEntity(CouponRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "applicableCourseEntity", ignore = true)
    @Mapping(target = "usedCount", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(CouponRequest request, @MappingTarget CouponEntity entity);
}
