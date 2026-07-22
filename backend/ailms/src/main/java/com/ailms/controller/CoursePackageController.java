package com.ailms.controller;

import com.ailms.request.CoursePackageRequest;
import com.ailms.request.CoursePackageSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CoursePackageResponse;
import com.ailms.service.ICoursePackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.ailms.response.PageResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/course-packages")
@RequiredArgsConstructor
public class CoursePackageController {

    private final ICoursePackageService coursePackageService;

    @PostMapping
    public ResponseEntity<ApiResponse<CoursePackageResponse>> create(@Valid @RequestBody CoursePackageRequest request) {
        CoursePackageResponse response = coursePackageService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Course package created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CoursePackageRequest request) {
        CoursePackageResponse response = coursePackageService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Course package updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> getById(@PathVariable Long id) {
        CoursePackageResponse response = coursePackageService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Course package retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CoursePackageResponse>>> getAll() {
        List<CoursePackageResponse> response = coursePackageService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Course packages retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<CoursePackageResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<CoursePackageResponse> response = coursePackageService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Course packages retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        coursePackageService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Course package deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<CoursePackageResponse>>> search(CoursePackageSearchRequest request) {
        PageResponse<CoursePackageResponse> result = coursePackageService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search course packages successfully", result));
    }
}
