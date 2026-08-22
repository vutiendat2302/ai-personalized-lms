package com.ailms.request;

import com.ailms.entity.enums.DeliveryModeEnum;
import com.ailms.entity.enums.CoursePackageStatusEnum;
import lombok.*;

import java.util.List;

@Getter
@Setter
public class CoursePackageSearchRequest extends CommonSearchRequest<CoursePackageStatusEnum> {

    private Long courseId;
    private DeliveryModeEnum deliveryMode;

    /** Khởi tạo tìm kiếm với thứ tự gói mới tạo nhất trước. */
    public CoursePackageSearchRequest() {
        setSort(List.of("createdAt:desc"));
    }

    /** Chỉ cho phép sắp xếp theo thời gian tạo để tránh sort trên field không hợp lệ. */
    @Override
    protected List<String> allowedSortFields() {
        return List.of("createdAt");
    }
}
