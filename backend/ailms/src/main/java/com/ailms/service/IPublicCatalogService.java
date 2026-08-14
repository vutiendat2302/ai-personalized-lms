package com.ailms.service;

import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.response.PageResponse;
import com.ailms.response.publicapi.PublicCategoryResponse;
import com.ailms.response.publicapi.PublicCourseCardResponse;
import com.ailms.response.publicapi.PublicTeacherResponse;

import java.util.List;

/** Hợp đồng dữ liệu công khai cho landing page và catalog chưa đăng nhập. */
public interface IPublicCatalogService {
    /** Lấy danh sách giáo viên đang hoạt động, có phân trang và tìm kiếm tên. */
    PageResponse<PublicTeacherResponse> getTeachers(String keyword, int page, int size);

    /** Lấy chi tiết hồ sơ công khai của một giáo viên đang hoạt động. */
    PublicTeacherResponse getTeacher(Long teacherId);

    /** Lấy danh sách khóa học đang bán do giáo viên phụ trách. */
    PageResponse<PublicCourseCardResponse> getTeacherCourses(Long teacherId, CourseLevelEnum level, Long categoryId, int page, int size);

    /** Lấy danh sách danh mục cùng số khóa học công khai bằng GROUP BY. */
    List<PublicCategoryResponse> getCategoryCourseCounts();

    /** Lấy các danh mục nổi bật theo số khóa học và tổng học viên thật. */
    PageResponse<PublicCategoryResponse> getHotCategories(int page, int size);

    /** Lấy khóa học phổ biến đang bán trong một danh mục. */
    PageResponse<PublicCourseCardResponse> getCategoryCourses(Long categoryId, CourseLevelEnum level, int page, int size);

    /** Lấy danh mục liên quan dựa trên các giáo viên cùng dạy nhiều danh mục. */
    List<PublicCategoryResponse> getRelatedCategories(Long categoryId, int limit);

    /** Lấy khóa học liên quan dựa trên giáo viên chung, không lặp khóa học hiện tại. */
    PageResponse<PublicCourseCardResponse> getRelatedCourses(Long categoryId, int page, int size);

    /** Lấy khóa học gần nghĩa với một khóa học công khai, loại chính khóa học đó. */
    PageResponse<PublicCourseCardResponse> getRelatedCoursesByCourse(Long courseId, int page, int size);

    /** Lấy danh mục gần nghĩa với một khóa học công khai. */
    List<PublicCategoryResponse> getRelatedCategoriesByCourse(Long courseId, int limit);

    /** Gợi ý khóa học bằng semantic catalog search theo lựa chọn guided của visitor. */
    PageResponse<PublicCourseCardResponse> recommendCourses(Long categoryId, CourseLevelEnum level,
                                                              String goal, int limit);
}
