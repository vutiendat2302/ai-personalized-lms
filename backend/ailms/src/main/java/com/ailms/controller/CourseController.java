package com.ailms.controller;

import org.springframework.data.domain.Page;
import com.ailms.request.CourseSearchRequest;
import com.ailms.response.CourseResponse;


import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.CourseStatusRequest;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
import com.ailms.response.CourseResponse;
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

    @PostMapping
    public ResponseEntity<ApiResponse<CourseResponse>> create(@Valid @RequestBody CreateCourseRequest request) {
        CourseResponse response = courseService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course created successfully", response));
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
}
