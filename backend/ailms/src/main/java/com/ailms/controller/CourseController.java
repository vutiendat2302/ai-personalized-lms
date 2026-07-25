package com.ailms.controller;

import com.ailms.request.BaseSearchRequest;
import com.ailms.request.CourseApprovalRequest;
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.CourseStatusRequest;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassResponse;
import com.ailms.response.CourseResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.SectionResponse;
import com.ailms.service.ICourseSectionService;
import com.ailms.service.ICourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/courses")
@RequiredArgsConstructor
public class CourseController {

    private final ICourseService courseService;
    private final ICourseSectionService courseSectionService;

    @PostMapping
    public ResponseEntity<ApiResponse<CourseResponse>> create(@Valid @RequestBody CreateCourseRequest request) {
        CourseResponse response = courseService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course created successfully", response));
    }

    @PostMapping("/teacher")
    public ResponseEntity<ApiResponse<CourseResponse>> createCourseByTeacher(
            @RequestParam Long teacherUserId,
            @Valid @RequestBody CreateCourseRequest request) {
        CourseResponse response = courseService.createCourseByTeacher(teacherUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course created by teacher (PENDING_APPROVAL)", response));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<CourseResponse>> approveCourse(
            @PathVariable Long id,
            @Valid @RequestBody CourseApprovalRequest request) {
        CourseResponse response = courseService.approveCourse(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course approval processed", response));
    }

    @GetMapping("/suggested-classes")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getSuggestedClassesForTeacher(@RequestParam Long teacherUserId) {
        List<ClassResponse> response = courseService.getSuggestedClassesForTeacher(teacherUserId);
        return ResponseEntity.ok(ApiResponse.of("Suggested classes retrieved successfully", response));
    }

    @PostMapping("/classes/{classId}/claim")
    public ResponseEntity<ApiResponse<ClassResponse>> claimClass(
            @RequestParam Long teacherUserId,
            @PathVariable Long classId) {
        ClassResponse response = courseService.claimClass(teacherUserId, classId);
        return ResponseEntity.ok(ApiResponse.of("Class claimed successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCourseRequest request) {
        CourseResponse response = courseService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CourseResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody CourseStatusRequest request) {
        CourseResponse response = courseService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course status updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(@PathVariable Long id) {
        courseService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Course deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourseById(@PathVariable Long id) {
        CourseResponse response = courseService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Course retrieved successfully", response));
    }

    @GetMapping("/{id}/sections")
    public ResponseEntity<ApiResponse<List<SectionResponse>>> getCourseSections(@PathVariable Long id) {
        List<SectionResponse> response = courseSectionService.getSectionsByCourseId(id);
        return ResponseEntity.ok(ApiResponse.of("Course sections retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getAllCourses() {
        List<CourseResponse> response = courseService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Courses retrieved successfully", response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<CourseResponse>>> searchCourse(CourseSearchRequest request) {
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
    public ResponseEntity<ApiResponse<Void>> recalculateMetrics() {
        courseService.recalculateTrendingScores();
        return ResponseEntity.ok(ApiResponse.message("Course metrics and trending scores recalculated successfully"));
    }

    @GetMapping("/active-count")
    public ResponseEntity<ApiResponse<Long>> countActiveCourses() {
        long response = courseService.countActiveCourses();
        return ResponseEntity.ok(ApiResponse.of("Active courses count retrieved successfully", response));
    }
}
