package com.ailms.controller;

import com.ailms.request.ClassRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassResponse;
import com.ailms.service.ClassService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/classes")
@RequiredArgsConstructor
public class ClassController {

    private final ClassService classService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClassResponse>> create(@Valid @RequestBody ClassRequest request) {
        ClassResponse response = classService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Class created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ClassRequest request) {
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

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        classService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Class deleted successfully"));
    }
}
