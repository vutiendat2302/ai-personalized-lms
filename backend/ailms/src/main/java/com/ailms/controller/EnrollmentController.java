package com.ailms.controller;

import org.springframework.data.domain.Page;
import com.ailms.request.EnrollmentSearchRequest;
import com.ailms.response.EnrollmentResponse;


import com.ailms.request.EnrollmentRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.EnrollmentResponse;
import com.ailms.service.IEnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private final IEnrollmentService enrollmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<EnrollmentResponse>> create(@Valid @RequestBody EnrollmentRequest request) {
        EnrollmentResponse response = enrollmentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Enrollment created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody EnrollmentRequest request) {
        EnrollmentResponse response = enrollmentService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Enrollment updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> getById(@PathVariable Long id) {
        EnrollmentResponse response = enrollmentService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Enrollment retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getAll() {
        List<EnrollmentResponse> response = enrollmentService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Enrollments retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getByUserId(@PathVariable Long userId) {
        List<EnrollmentResponse> response = enrollmentService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Enrollments retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<EnrollmentResponse> response = enrollmentService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Enrollments retrieved successfully", response));
    }

    @GetMapping("/class/{classId}")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getByClassId(@PathVariable Long classId) {
        List<EnrollmentResponse> response = enrollmentService.getByClassId(classId);
        return ResponseEntity.ok(ApiResponse.of("Enrollments retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        enrollmentService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Enrollment deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<EnrollmentResponse>>> search(EnrollmentSearchRequest request) {
        Page<EnrollmentResponse> result = enrollmentService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Enrollment successfully", result));
    }
}
