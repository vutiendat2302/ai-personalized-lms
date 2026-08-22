package com.ailms.mapper;

import com.ailms.entity.CoursePackageEntity;
import com.ailms.request.CreateCoursePackageRequest;
import com.ailms.request.UpdateCoursePackageRequest;
import com.ailms.response.CoursePackageResponse;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Mapper(componentModel = "spring")
public interface CoursePackageMapper {

    /** Chuyển entity thành response và bổ sung dữ liệu lớp học. */
    @Mapping(target = "courseId", source = "courseEntity.id")
    @Mapping(target = "courseName", source = "courseEntity.name")
    @Mapping(target = "classId", source = "classEntity.id")
    @Mapping(target = "className", source = "classEntity.name")
    @Mapping(target = "currentMemberCount", source = "classEntity.currentMemberCount")
    @Mapping(target = "maxMembers", source = "classEntity.maxMembers")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "createdBy", source = "createdBy")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "updatedBy", source = "updatedBy")
    @Mapping(target = "discountPercentage", ignore = true)
    @Mapping(target = "classDetail", ignore = true)
    @Mapping(target = "createdByName", ignore = true)
    @Mapping(target = "updatedByName", ignore = true)
    CoursePackageResponse toResponse(CoursePackageEntity entity);

    /** Chuyển danh sách entity thành danh sách response. */
    List<CoursePackageResponse> toResponseList(List<CoursePackageEntity> list);

    /** Tạo entity từ request tạo mới, bỏ qua các trường do backend quản lý. */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "status", constant = "ACTIVE")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    CoursePackageEntity toEntity(CreateCoursePackageRequest request);

    /** Cập nhật các trường nghiệp vụ nhưng luôn giữ nguyên ID, code và audit fields. */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "courseEntity", ignore = true)
    @Mapping(target = "classEntity", ignore = true)
    @Mapping(target = "deliveryMode", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateFromRequest(UpdateCoursePackageRequest request, @MappingTarget CoursePackageEntity entity);

    /** Tính phần trăm giảm giá từ giá gốc và giá bán sau khi mapping. */
    @AfterMapping
    default void calculateDiscountPercentage(CoursePackageEntity entity, @MappingTarget CoursePackageResponse response) {
        BigDecimal originalPrice = entity.getOriginalPrice();
        BigDecimal price = entity.getPrice();
        if (originalPrice == null || price == null || originalPrice.signum() <= 0 || price.compareTo(originalPrice) >= 0) {
            response.setDiscountPercentage(BigDecimal.ZERO);
            return;
        }

        BigDecimal discount = originalPrice.subtract(price)
                .multiply(BigDecimal.valueOf(100))
                .divide(originalPrice, 2, RoundingMode.HALF_UP);
        response.setDiscountPercentage(discount);
    }
}
