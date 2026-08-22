package com.ailms.response.publicapi;

import lombok.Builder;
import lombok.Value;

/** Thông tin danh mục an toàn để hiển thị trên landing page. */
@Value
@Builder
public class PublicCategoryResponse {
    Long id;
    String name;
    String slug;
    String description;
    String iconUrl;
    long publicCourseCount;
    long popularityScore;
}
