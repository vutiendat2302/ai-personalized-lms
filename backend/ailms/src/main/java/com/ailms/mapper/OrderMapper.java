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

    /** Chuyển order item thành snapshot hiển thị, không đọc giá hiện tại thay cho giá đã mua. */
    @Mapping(target = "orderId", source = "orderEntity.id")
    @Mapping(target = "coursePackageId", source = "coursePackageEntity.id")
    @Mapping(target = "coursePackageName", source = "coursePackageEntity.name")
    @Mapping(target = "courseName", source = "coursePackageEntity.courseEntity.name")
    @Mapping(target = "packageName", source = "coursePackageEntity.name")
    @Mapping(target = "relatedEnrollmentId", source = "relatedEnrollment.id")
    OrderItemResponse toItemResponse(OrderItemEntity entity);

    /** Chuyển order thành response quản trị và chủ đơn hàng. */
    @Mapping(target = "userId", source = "userEntity.id")
    @Mapping(target = "userName", source = "userEntity.username")
    @Mapping(target = "userEmail", source = "userEntity.email")
    OrderResponse toResponse(OrderEntity entity);

    /** Chuyển danh sách order sang response. */
    List<OrderResponse> toResponseList(List<OrderEntity> entities);
}
