package com.ailms.response;

import com.ailms.entity.enums.DeliveryModeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Các chỉ số tổng quan hiển thị tại phần đầu trang chi tiết khóa học. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseMetricResponse {

    private Long courseId;
    private Integer moduleCount;
    private Double averageRating;
    private Long reviewCount;
    private String level;
    private DeliveryModeEnum deliveryMode;
    private Integer satisfactionPercent;
}
