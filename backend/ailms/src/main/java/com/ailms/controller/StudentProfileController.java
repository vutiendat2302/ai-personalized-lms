package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.response.StudentProfileResponse;


import com.ailms.request.StudentProfileRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.StudentProfileResponse;
import com.ailms.service.IStudentProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/student-profiles")
@RequiredArgsConstructor
public class StudentProfileController {

    private final IStudentProfileService studentProfileService;

    @PostMapping
    public ResponseEntity<ApiResponse<StudentProfileResponse>> create(@Valid @RequestBody StudentProfileRequest request) {
        StudentProfileResponse response = studentProfileService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Student profile created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody StudentProfileRequest request) {
        StudentProfileResponse response = studentProfileService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Student profile updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getById(@PathVariable Long id) {
        StudentProfileResponse response = studentProfileService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Student profile retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentProfileResponse>>> getAll() {
        List<StudentProfileResponse> response = studentProfileService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Student profiles retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        studentProfileService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Student profile deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<StudentProfileResponse>>> search(StudentProfileSearchRequest request) {
        PageResponse<StudentProfileResponse> result = studentProfileService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search StudentProfile successfully", result));
    }
}
