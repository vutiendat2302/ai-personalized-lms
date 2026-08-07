package com.ailms.mapper;

import com.ailms.entity.OrderEntity;
import com.ailms.entity.OrderItemEntity;
import com.ailms.response.OrderItemResponse;
import com.ailms.response.OrderResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(target = "coursePackageId", source = "coursePackageEntity.id")
    @Mapping(target = "coursePackageName", source = "coursePackageEntity.name")
    @Mapping(target = "relatedEnrollmentId", source = "relatedEnrollment.id")
    OrderItemResponse toItemResponse(OrderItemEntity entity);

    @Mapping(target = "userId", source = "userEntity.id")
    @Mapping(target = "userName", source = "userEntity.username")
    OrderResponse toResponse(OrderEntity entity);

    List<OrderResponse> toResponseList(List<OrderEntity> entities);
}
