package com.ailms.controller;

import com.ailms.request.CreateCoursePackageRequest;
import com.ailms.request.CoursePackageSearchRequest;
import com.ailms.request.UpdateCoursePackageRequest;
import com.ailms.request.CoursePackageStatusRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CoursePackageResponse;
import com.ailms.response.CoursePackageStatsResponse;
import com.ailms.response.CourseClassDetailResponse;
import com.ailms.service.ICourseDetailService;
import com.ailms.service.ICoursePackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.ailms.response.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/course-packages")
@RequiredArgsConstructor
public class CoursePackageController {

    private final ICoursePackageService coursePackageService;
    private final ICourseDetailService courseDetailService;

    /** Lấy thống kê tổng số gói, đang hoạt động, hết chỗ và tạm dừng. */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<CoursePackageStatsResponse>> getStats() {
        CoursePackageStatsResponse response = coursePackageService.getStats();
        return ResponseEntity.ok(ApiResponse.of("Course package statistics retrieved successfully", response));
    }

    /** Tạo gói khóa học mới với mã do backend tự sinh. */
    @PostMapping
    @PreAuthorize("@courseAccess.canManage(#request.courseId, authentication)")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> create(@Valid @RequestBody CreateCoursePackageRequest request) {
        CoursePackageResponse response = coursePackageService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Course package created successfully", response));
    }

    /** Cập nhật dữ liệu nghiệp vụ của gói nhưng không thay đổi mã. */
    @PutMapping("/{id}")
    @PreAuthorize("@courseAccess.canManagePackage(#id, authentication)")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCoursePackageRequest request) {
        CoursePackageResponse response = coursePackageService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course package updated successfully", response));
    }

    /** Cập nhật trạng thái bán/ẩn của gói theo quyền quản lý khóa học. */
    @PatchMapping("/{id}/status")
    @PreAuthorize("@courseAccess.canManagePackage(#id, authentication)")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody CoursePackageStatusRequest request) {
        CoursePackageResponse response = coursePackageService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course package status updated successfully", response));
    }

    /** Lấy chi tiết gói theo ID. */
    @GetMapping("/{id}")
    @PreAuthorize("@courseAccess.canManagePackage(#id, authentication)")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> getById(@PathVariable Long id) {
        CoursePackageResponse response = coursePackageService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Course package retrieved successfully", response));
    }

    /** Lấy thông tin lớp nhóm gắn với gói để học viên kiểm tra trước thanh toán. */
    @GetMapping("/{id}/class-detail")
    public ResponseEntity<ApiResponse<CourseClassDetailResponse>> getClassDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                "Group class detail retrieved successfully", courseDetailService.getGroupClassDetail(id)));
    }

    /** Lấy toàn bộ gói khóa học. */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<List<CoursePackageResponse>>> getAll() {
        List<CoursePackageResponse> response = coursePackageService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Course packages retrieved successfully", response));
    }

    /** Lấy các gói thuộc một khóa học. */
    @GetMapping("/course/{courseId}")
    @PreAuthorize("@courseAccess.canManage(#courseId, authentication)")
    public ResponseEntity<ApiResponse<List<CoursePackageResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<CoursePackageResponse> response = coursePackageService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Course packages retrieved successfully", response));
    }

    /** Xóa gói theo ID. */
    @DeleteMapping("/{id}")
    @PreAuthorize("@courseAccess.canManagePackage(#id, authentication)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        coursePackageService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Course package deleted successfully"));
    }

    /** Tìm kiếm gói theo từ khóa mã/tên và các bộ lọc. */
    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<PageResponse<CoursePackageResponse>>> search(CoursePackageSearchRequest request) {
        PageResponse<CoursePackageResponse> result = coursePackageService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search course packages successfully", result));
    }
}
