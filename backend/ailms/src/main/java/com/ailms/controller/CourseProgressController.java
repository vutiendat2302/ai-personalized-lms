package com.ailms.controller;

import org.springframework.data.domain.Page;
import com.ailms.request.CourseProgressSearchRequest;
import com.ailms.response.CourseProgressResponse;


import com.ailms.request.CourseProgressRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CourseProgressResponse;
import com.ailms.service.ICourseProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/course-progress")
@RequiredArgsConstructor
public class CourseProgressController {

    private final ICourseProgressService courseProgressService;

    @PostMapping
    public ResponseEntity<ApiResponse<CourseProgressResponse>> create(@Valid @RequestBody CourseProgressRequest request) {
        CourseProgressResponse response = courseProgressService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course progress created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseProgressResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CourseProgressRequest request) {
        CourseProgressResponse response = courseProgressService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course progress updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseProgressResponse>> getById(@PathVariable Long id) {
        CourseProgressResponse response = courseProgressService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Course progress retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseProgressResponse>>> getAll() {
        List<CourseProgressResponse> response = courseProgressService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Course progress records retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<CourseProgressResponse>>> getByUserId(@PathVariable Long userId) {
        List<CourseProgressResponse> response = courseProgressService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Course progress records retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<CourseProgressResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<CourseProgressResponse> response = courseProgressService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Course progress records retrieved successfully", response));
    }

    @GetMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<ApiResponse<List<CourseProgressResponse>>> getByEnrollmentId(@PathVariable Long enrollmentId) {
        List<CourseProgressResponse> response = courseProgressService.getByEnrollmentId(enrollmentId);
        return ResponseEntity.ok(ApiResponse.of("Course progress records retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        courseProgressService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Course progress deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<CourseProgressResponse>>> search(CourseProgressSearchRequest request) {
        Page<CourseProgressResponse> result = courseProgressService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search CourseProgress successfully", result));
    }
}
