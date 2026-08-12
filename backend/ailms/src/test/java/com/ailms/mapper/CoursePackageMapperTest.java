package com.ailms.mapper;

import com.ailms.entity.CoursePackageEntity;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.request.UpdateCoursePackageRequest;
import com.ailms.response.CoursePackageResponse;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CoursePackageMapperTest {

    private final CoursePackageMapper mapper = Mappers.getMapper(CoursePackageMapper.class);

    /** Kiểm tra response tính đúng phần trăm giảm giá đến hai chữ số thập phân. */
    @Test
    void toResponseCalculatesDiscountPercentage() {
        CoursePackageEntity entity = CoursePackageEntity.builder()
                .code("CP-2608-ABC123")
                .price(new BigDecimal("750000"))
                .originalPrice(new BigDecimal("1000000"))
                .createdBy(101L)
                .updatedBy(102L)
                .build();

        CoursePackageResponse response = mapper.toResponse(entity);

        assertEquals(new BigDecimal("25.00"), response.getDiscountPercentage());
        assertEquals(101L, response.getCreatedBy());
        assertEquals(102L, response.getUpdatedBy());
    }

    /** Kiểm tra mapper cập nhật không thay đổi mã gói do backend quản lý. */
    @Test
    void updateFromRequestKeepsGeneratedCode() {
        CoursePackageEntity entity = CoursePackageEntity.builder()
                .code("CP-2608-ABC123")
                .name("Old package")
                .deliveryMode(DeliveryModeEnum.GROUP_CLASS)
                .build();
        UpdateCoursePackageRequest request = UpdateCoursePackageRequest.builder()
                .name("New package")
                .price(new BigDecimal("900000"))
                .originalPrice(new BigDecimal("1000000"))
                .status(CoursePackageStatusEnum.ACTIVE)
                .build();

        mapper.updateFromRequest(request, entity);

        assertEquals("CP-2608-ABC123", entity.getCode());
        assertEquals("New package", entity.getName());
        assertEquals(DeliveryModeEnum.GROUP_CLASS, entity.getDeliveryMode());
    }
}
