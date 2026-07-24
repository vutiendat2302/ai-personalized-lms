package com.ailms.mapper;

import com.ailms.entity.CartItemEntity;
import com.ailms.response.CartItemResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface CartMapper {

    @Mapping(target = "userId", source = "userEntity.id")
    @Mapping(target = "coursePackageId", source = "coursePackageEntity.id")
    @Mapping(target = "packageName", source = "coursePackageEntity.name")
    @Mapping(target = "courseId", source = "coursePackageEntity.courseEntity.id")
    @Mapping(target = "courseName", source = "coursePackageEntity.courseEntity.name")
    @Mapping(target = "price", source = "coursePackageEntity.price")
    @Mapping(target = "deliveryMode", source = "coursePackageEntity.deliveryMode")
    CartItemResponse toResponse(CartItemEntity entity);

    List<CartItemResponse> toResponseList(List<CartItemEntity> list);
}
