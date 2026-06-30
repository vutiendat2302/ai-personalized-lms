package com.ailms.mapper;


import com.ailms.entity.CategoryEntity;
import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.CategoryResponse;
import org.hibernate.sql.Update;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    /**
     *Mapping đánh dấu một quy tắc ánh xạ cho một trường cụ thể
     * target: chỉ trường đích trong Response
     * ignore = true: không copy bất kỳ giá trị nào từ entity vào trường đó trong response
     * Khi tền nguồn và tên đích không giống nhau thì có thể dùng Mapstruc để tự động map,
     * kiểu bỏ qua trường đó trong response
     * Mapping(source = "userId", target = "id")
     * source chỉ nguồn trong entity
     * Ánh xạ các đối tượng con, sử dụng . để di sâu vào đối tượng
     * source = "address.city", target = "cityname"
     * Ánh xạ từ nhiều nguồn vào một đối tượng
     * Gán giá trị mặc định
     */
    @Mapping(target = "courseCount", ignore = true)
    CategoryResponse toCategoryResponse(CategoryEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "courses", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    CategoryEntity toCategoryEntity(CreateCategoryRequest request);


    /**
     * BeanMapping Ignore đảm bảo khônng cập nhật các trường null vào entity
     * Không cập nhật staus vì sau này có phân quyền, sẽ có cập nhật staus riêng
     * @param entity
     * @param request
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "courses", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateCategoryEntity(@MappingTarget CategoryEntity entity, UpdateCategoryRequest request);


    /**
     * Gắn courseCount vào response, MapStruct không tự tính được field này
     * không có trong entity
     * nên cần query riêng từ service
     */
    default CategoryResponse withCourseCount(CategoryResponse response, Long courseCount) {
        response.setCourseCount(courseCount);
        return response;
    }
}
