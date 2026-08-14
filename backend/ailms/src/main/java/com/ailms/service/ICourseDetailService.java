package com.ailms.service;

import com.ailms.response.CourseClassDetailResponse;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.response.CourseDetailResponse;

/** Tổng hợp dữ liệu công khai và quyền truy cập cho trang chi tiết khóa học. */
public interface ICourseDetailService {
    /** Lấy toàn bộ dữ liệu trang chi tiết theo người dùng hiện tại. */
    CourseDetailResponse getDetail(Long courseId, Long currentUserId);

    /** Lấy cây chương trình học với cờ preview, accessible và locked. */
    CourseCurriculumResponse getCurriculum(Long courseId, Long currentUserId);

    /** Lấy chi tiết lớp gắn với một gói GROUP_CLASS. */
    CourseClassDetailResponse getGroupClassDetail(Long packageId);
}
