package com.ailms.response.publicapi;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/** Hồ sơ giảng viên tối thiểu, chỉ chứa thông tin được phép công khai. */
@Value
@Builder
public class PublicTeacherResponse {
    Long id;
    String fullName;
    String avatarUrl;
    String title;
    String bio;
    Integer experienceYears;
    List<PublicCategoryResponse> categories;
    long courseCount;
    long studentCount;
    Double averageRating;
}
