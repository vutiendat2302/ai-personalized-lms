package com.ailms.response.publicapi;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

/** Dữ liệu card khóa học công khai, lấy từ khóa học và gói đang mở bán. */
@Value
@Builder
public class PublicCourseCardResponse {
    Long id;
    String name;
    String slug;
    String thumbnailUrl;
    String description;
    String level;
    BigDecimal currentPrice;
    BigDecimal originalPrice;
    String teacherName;
    Double averageRating;
    Integer reviewCount;
    Integer studentCount;
    String categoryName;
    List<String> deliveryModes;
}
