package com.ailms.controller;

import com.ailms.entity.enums.CourseStatusEnum;
import com.ailms.request.BaseSearchRequest;
import com.ailms.request.CourseApprovalRequest;
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.CourseStatusRequest;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassResponse;
import com.ailms.response.CourseResponse;
import com.ailms.response.CourseMetricResponse;
import com.ailms.response.CourseDetailResponse;
import com.ailms.response.CourseCurriculumResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.ICourseDetailService;
import com.ailms.response.PageResponse;
import com.ailms.response.SectionResponse;
import com.ailms.service.ICourseSectionService;
import com.ailms.service.ICourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/courses")
@RequiredArgsConstructor
public class CourseController {

    private final ICourseService courseService;
    private final ICourseSectionService courseSectionService;
    private final ICourseDetailService courseDetailService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<CourseResponse>> create(@Valid @RequestBody CreateCourseRequest request) {
        CourseResponse response = courseService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course created successfully", response));
    }

    @PostMapping("/teacher")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR') or #teacherUserId == authentication.principal.user.id")
    public ResponseEntity<ApiResponse<CourseResponse>> createCourseByTeacher(
            @RequestParam Long teacherUserId,
            @Valid @RequestBody CreateCourseRequest request) {
        CourseResponse response = courseService.createCourseByTeacher(teacherUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teacher course draft created successfully", response));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<CourseResponse>> approveCourse(
            @PathVariable Long id,
            @Valid @RequestBody CourseApprovalRequest request) {
        CourseResponse response = courseService.approveCourse(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course approval processed", response));
    }

    /** Trả danh sách khóa học PENDING thật để trung tâm phê duyệt xử lý. */
    @GetMapping("/pending-approvals")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<PageResponse<CourseResponse>>> getPendingApprovalCourses(
            BaseSearchRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Pending approval courses retrieved successfully",
                courseService.getPendingApprovalCourses(request)));
    }

    @GetMapping("/suggested-classes")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getSuggestedClassesForTeacher(@RequestParam Long teacherUserId) {
        List<ClassResponse> response = courseService.getSuggestedClassesForTeacher(teacherUserId);
        return ResponseEntity.ok(ApiResponse.of("Suggested classes retrieved successfully", response));
    }

    @PostMapping("/classes/{classId}/claim")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR') or #teacherUserId == authentication.principal.user.id")
    public ResponseEntity<ApiResponse<ClassResponse>> claimClass(
            @RequestParam Long teacherUserId,
            @PathVariable Long classId) {
        ClassResponse response = courseService.claimClass(teacherUserId, classId);
        return ResponseEntity.ok(ApiResponse.of("Class claimed successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@courseAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<CourseResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCourseRequest request) {
        CourseResponse response = courseService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<CourseResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody CourseStatusRequest request) {
        CourseResponse response = courseService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course status updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@courseAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(@PathVariable Long id) {
        courseService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Course deleted successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@courseAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourseById(@PathVariable Long id) {
        CourseResponse response = courseService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Course retrieved successfully", response));
    }

    /** Trả toàn bộ dữ liệu thật phục vụ trang chi tiết khóa học công khai. */
    @GetMapping("/{id}/detail")
    public ResponseEntity<ApiResponse<CourseDetailResponse>> getCourseDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        Long userId = currentUser != null ? currentUser.getUser().getId() : null;
        return ResponseEntity.ok(ApiResponse.of(
                "Course detail retrieved successfully", courseDetailService.getDetail(id, userId)));
    }

    /** Trả cây chương trình học với quyền preview theo người dùng hiện tại. */
    @GetMapping("/{id}/curriculum")
    public ResponseEntity<ApiResponse<CourseCurriculumResponse>> getPublicCurriculum(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        Long userId = currentUser != null ? currentUser.getUser().getId() : null;
        return ResponseEntity.ok(ApiResponse.of(
                "Course curriculum retrieved successfully", courseDetailService.getCurriculum(id, userId)));
    }

    /** Trả về các chỉ số tổng quan thực tế của một khóa học. */
    @GetMapping("/{id}/metrics")
    public ResponseEntity<ApiResponse<CourseMetricResponse>> getCourseMetrics(@PathVariable Long id) {
        CourseMetricResponse response = courseService.getMetrics(id);
        return ResponseEntity.ok(ApiResponse.of("Course metrics retrieved successfully", response));
    }

    @GetMapping("/{id}/sections")
    @PreAuthorize("@courseAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<List<SectionResponse>>> getCourseSections(@PathVariable Long id) {
        List<SectionResponse> response = courseSectionService.getSectionsByCourseId(id);
        return ResponseEntity.ok(ApiResponse.of("Course sections retrieved successfully", response));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getAllCourses() {
        List<CourseResponse> response = courseService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Courses retrieved successfully", response));
    }

    /** Tìm khóa học; người dùng công khai/học viên luôn bị giới hạn ở khóa đang mở bán. */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<CourseResponse>>> searchCourse(
            CourseSearchRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        if (!canSearchNonPublicCourses(currentUser)) {
            request.setStatus(CourseStatusEnum.ACTIVE);
            request.setCreatedBy(null);
        }
        PageResponse<CourseResponse> response = courseService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Courses retrieved successfully", response));
    }

    @GetMapping("/outstanding")
    public ResponseEntity<ApiResponse<PageResponse<CourseResponse>>> getOutstandingCourses(@Valid BaseSearchRequest request) {
        PageResponse<CourseResponse> response = courseService.getOutstandingCourses(request);
        return ResponseEntity.ok(ApiResponse.of("Outstanding courses retrieved successfully", response));
    }

    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<PageResponse<CourseResponse>>> getTrendingCourses(@Valid BaseSearchRequest request) {
        PageResponse<CourseResponse> response = courseService.getTrendingCourses(request);
        return ResponseEntity.ok(ApiResponse.of("Trending courses retrieved successfully", response));
    }

    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<PageResponse<CourseResponse>>> getLatestCourses(@Valid BaseSearchRequest request) {
        PageResponse<CourseResponse> response = courseService.getLatestCourses(request);
        return ResponseEntity.ok(ApiResponse.of("Latest courses retrieved successfully", response));
    }

    @PostMapping("/metrics/recalculate")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Void>> recalculateMetrics() {
        courseService.recalculateTrendingScores();
        return ResponseEntity.ok(ApiResponse.message("Course metrics and trending scores recalculated successfully"));
    }

    @GetMapping("/active-count")
    public ResponseEntity<ApiResponse<Long>> countActiveCourses() {
        long response = courseService.countActiveCourses();
        return ResponseEntity.ok(ApiResponse.of("Active courses count retrieved successfully", response));
    }

    /** Cho phép staff quản trị/soạn thảo dùng bộ lọc trạng thái không công khai. */
    private boolean canSearchNonPublicCourses(CustomUserDetails currentUser) {
        if (currentUser == null || currentUser.getAuthorities() == null) return false;
        return currentUser.getAuthorities().stream()
                .map(item -> item.getAuthority().toUpperCase())
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_HR")
                        || role.equals("ROLE_TEACHER") || role.equals("ROLE_TA"));
    }
}
