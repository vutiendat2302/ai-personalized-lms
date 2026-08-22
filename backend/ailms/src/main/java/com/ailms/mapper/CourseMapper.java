package com.ailms.mapper;

import com.ailms.entity.CourseEntity;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.CourseResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    /** Tạo entity khóa học và bỏ qua các trường do backend quản lý. */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "categoryEntity", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "sections", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    @Mapping(target = "avgRating", ignore = true)
    @Mapping(target = "reviewCount", ignore = true)
    @Mapping(target = "viewCount", ignore = true)
    @Mapping(target = "enrollmentCount", ignore = true)
    @Mapping(target = "trendingScore", ignore = true)
    CourseEntity toEntity(CreateCourseRequest request);


    /** Cập nhật khóa học nhưng luôn giữ nguyên ID, mã tự sinh và các trường hệ thống. */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "categoryEntity", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "sections", ignore = true)
    @Mapping(target = "avgRating", ignore = true)
    @Mapping(target = "reviewCount", ignore = true)
    @Mapping(target = "viewCount", ignore = true)
    @Mapping(target = "enrollmentCount", ignore = true)
    @Mapping(target = "trendingScore", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    void updateEntityFromRequest(UpdateCourseRequest request, @MappingTarget CourseEntity entity);

    /** Chuyển entity khóa học thành response kèm thông tin danh mục. */
    @Mapping(target = "categoryId", expression = "java(entity.getCategoryEntity() != null ? entity.getCategoryEntity().getId() : null)")
    @Mapping(target = "categoryName", expression = "java(entity.getCategoryEntity() != null ? entity.getCategoryEntity().getName() : null)")
    CourseResponse toResponse(CourseEntity entity);


}
