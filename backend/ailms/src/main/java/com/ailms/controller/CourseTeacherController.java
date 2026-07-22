package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseTeacherSearchRequest;
import com.ailms.response.CourseTeacherResponse;


import com.ailms.request.CourseTeacherRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CourseTeacherResponse;
import com.ailms.service.ICourseTeacherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/course-teachers")
@RequiredArgsConstructor
public class CourseTeacherController {

    private final ICourseTeacherService courseTeacherService;

    @PostMapping
    public ResponseEntity<ApiResponse<CourseTeacherResponse>> create(@Valid @RequestBody CourseTeacherRequest request) {
        CourseTeacherResponse response = courseTeacherService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course teacher created successfully", response));
    }

    @PutMapping("/{courseId}/{userId}")
    public ResponseEntity<ApiResponse<CourseTeacherResponse>> update(
            @PathVariable Long courseId,
            @PathVariable Long userId,
            @Valid @RequestBody CourseTeacherRequest request) {
        CourseTeacherResponse response = courseTeacherService.update(courseId, userId, request);
        return ResponseEntity.ok(ApiResponse.of("Course teacher updated successfully", response));
    }

    @GetMapping("/{courseId}/{userId}")
    public ResponseEntity<ApiResponse<CourseTeacherResponse>> getById(
            @PathVariable Long courseId,
            @PathVariable Long userId) {
        CourseTeacherResponse response = courseTeacherService.getById(courseId, userId);
        return ResponseEntity.ok(ApiResponse.of("Course teacher retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseTeacherResponse>>> getAll() {
        List<CourseTeacherResponse> response = courseTeacherService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Course teachers retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<CourseTeacherResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<CourseTeacherResponse> response = courseTeacherService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Course teachers retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<CourseTeacherResponse>>> getByUserId(@PathVariable Long userId) {
        List<CourseTeacherResponse> response = courseTeacherService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Course teachers retrieved successfully", response));
    }

    @DeleteMapping("/{courseId}/{userId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long courseId,
            @PathVariable Long userId) {
        courseTeacherService.delete(courseId, userId);
        return ResponseEntity.ok(ApiResponse.message("Course teacher deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<CourseTeacherResponse>>> search(CourseTeacherSearchRequest request) {
        PageResponse<CourseTeacherResponse> result = courseTeacherService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search CourseTeacher successfully", result));
    }
}
