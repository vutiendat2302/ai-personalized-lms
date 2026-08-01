package com.ailms.controller;

import com.ailms.request.CreateClassRequest;
import com.ailms.request.UpdateClassRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.ClassSearchRequest;
import com.ailms.response.ClassResponse;
import com.ailms.response.ClassScheduleResponse;


import com.ailms.response.ApiResponse;
import com.ailms.service.IClassService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/classes")
@RequiredArgsConstructor
public class ClassController {

    private final IClassService classService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClassResponse>> create(@Valid @RequestBody CreateClassRequest request) {
        ClassResponse response = classService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Class created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClassRequest request) {
        ClassResponse response = classService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Class updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassResponse>> getById(@PathVariable Long id) {
        ClassResponse response = classService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Class retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getAll() {
        List<ClassResponse> response = classService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Classes retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<ClassResponse> response = classService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Classes retrieved successfully", response));
    }

    @GetMapping("/{id}/schedules")
    public ResponseEntity<ApiResponse<List<ClassScheduleResponse>>> getSchedules(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Class schedules retrieved successfully", classService.getSchedules(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        classService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Class deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<ClassResponse>>> search(ClassSearchRequest request) {
        PageResponse<ClassResponse> result = classService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Class successfully", result));
    }
}
