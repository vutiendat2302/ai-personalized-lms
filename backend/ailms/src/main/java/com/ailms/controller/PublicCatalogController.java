package com.ailms.controller;

import com.ailms.entity.enums.CourseLevelEnum;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.publicapi.PublicCategoryResponse;
import com.ailms.response.publicapi.PublicCourseCardResponse;
import com.ailms.response.publicapi.PublicTeacherResponse;
import com.ailms.service.IPublicCatalogService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** API chỉ đọc cho landing page, không trả dữ liệu quản trị hoặc dữ liệu cá nhân riêng tư. */
@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("${api.prefix}/public")
public class PublicCatalogController {
    private final IPublicCatalogService catalogService;

    /** Lấy giáo viên đang hoạt động để hiển thị trên landing page. */
    @GetMapping("/teachers")
    public ResponseEntity<ApiResponse<PageResponse<PublicTeacherResponse>>> getTeachers(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Public teachers retrieved successfully",
                catalogService.getTeachers(keyword, page, size)));
    }

    /** Lấy chi tiết giáo viên công khai. */
    @GetMapping("/teachers/{teacherId}")
    public ResponseEntity<ApiResponse<PublicTeacherResponse>> getTeacher(@PathVariable @Min(1) Long teacherId) {
        return ResponseEntity.ok(ApiResponse.of("Public teacher retrieved successfully",
                catalogService.getTeacher(teacherId)));
    }

    /** Lấy khóa học đang bán của một giáo viên. */
    @GetMapping("/teachers/{teacherId}/courses")
    public ResponseEntity<ApiResponse<PageResponse<PublicCourseCardResponse>>> getTeacherCourses(
            @PathVariable @Min(1) Long teacherId,
            @RequestParam(required = false) CourseLevelEnum level,
            @RequestParam(required = false) @Min(1) Long categoryId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Public teacher courses retrieved successfully",
                catalogService.getTeacherCourses(teacherId, level, categoryId, page, size)));
    }

    /** Lấy số khóa học công khai theo từng danh mục. */
    @GetMapping("/categories/course-counts")
    public ResponseEntity<ApiResponse<List<PublicCategoryResponse>>> getCategoryCourseCounts() {
        return ResponseEntity.ok(ApiResponse.of("Public category counts retrieved successfully",
                catalogService.getCategoryCourseCounts()));
    }

    /** Lấy danh mục nổi bật từ số liệu catalog thật. */
    @GetMapping("/categories/hot")
    public ResponseEntity<ApiResponse<PageResponse<PublicCategoryResponse>>> getHotCategories(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Hot categories retrieved successfully",
                catalogService.getHotCategories(page, size)));
    }

    /** Lấy khóa học phổ biến trong một danh mục. */
    @GetMapping("/categories/{categoryId}/popular-courses")
    public ResponseEntity<ApiResponse<PageResponse<PublicCourseCardResponse>>> getPopularCourses(
            @PathVariable @Min(1) Long categoryId,
            @RequestParam(required = false) CourseLevelEnum level,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Popular category courses retrieved successfully",
                catalogService.getCategoryCourses(categoryId, level, page, size)));
    }

    /** Lấy toàn bộ khóa học công khai trong category, dùng chung với popular-courses. */
    @GetMapping("/categories/{categoryId}/courses")
    public ResponseEntity<ApiResponse<PageResponse<PublicCourseCardResponse>>> getCategoryCourses(
            @PathVariable @Min(1) Long categoryId,
            @RequestParam(required = false) CourseLevelEnum level,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Public category courses retrieved successfully",
                catalogService.getCategoryCourses(categoryId, level, page, size)));
    }

    /** Lấy category liên quan dựa trên dữ liệu giáo viên dùng chung, không hard-code tên. */
    @GetMapping("/categories/{categoryId}/related-categories")
    public ResponseEntity<ApiResponse<List<PublicCategoryResponse>>> getRelatedCategories(
            @PathVariable @Min(1) Long categoryId,
            @RequestParam(defaultValue = "6") @Min(1) @Max(20) int limit) {
        return ResponseEntity.ok(ApiResponse.of("Related categories retrieved successfully",
                catalogService.getRelatedCategories(categoryId, limit)));
    }

    /** Lấy khóa học liên quan thông qua giáo viên cùng giảng dạy. */
    @GetMapping("/categories/{categoryId}/related-courses")
    public ResponseEntity<ApiResponse<PageResponse<PublicCourseCardResponse>>> getRelatedCourses(
            @PathVariable @Min(1) Long categoryId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Related courses retrieved successfully",
                catalogService.getRelatedCourses(categoryId, page, size)));
    }

    /** Lấy khóa học liên quan bằng vector của một khóa học công khai. */
    @GetMapping("/courses/{courseId}/related-courses")
    public ResponseEntity<ApiResponse<PageResponse<PublicCourseCardResponse>>> getRelatedCoursesByCourse(
            @PathVariable @Min(1) Long courseId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return ResponseEntity.ok(ApiResponse.of("Related courses by course retrieved successfully",
                catalogService.getRelatedCoursesByCourse(courseId, page, size)));
    }

    /** Lấy danh mục liên quan bằng vector của một khóa học công khai. */
    @GetMapping("/courses/{courseId}/related-categories")
    public ResponseEntity<ApiResponse<List<PublicCategoryResponse>>> getRelatedCategoriesByCourse(
            @PathVariable @Min(1) Long courseId,
            @RequestParam(defaultValue = "6") @Min(1) @Max(20) int limit) {
        return ResponseEntity.ok(ApiResponse.of("Related categories by course retrieved successfully",
                catalogService.getRelatedCategoriesByCourse(courseId, limit)));
    }
}
