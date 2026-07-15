package com.ailms.controller;

import org.springframework.data.domain.Page;
import com.ailms.request.LessonProgressSearchRequest;
import com.ailms.response.LessonProgressResponse;


import com.ailms.request.LessonProgressRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.LessonProgressResponse;
import com.ailms.service.ILessonProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/lesson-progress")
@RequiredArgsConstructor
public class LessonProgressController {

    private final ILessonProgressService lessonProgressService;

    @PostMapping
    public ResponseEntity<ApiResponse<LessonProgressResponse>> create(@Valid @RequestBody LessonProgressRequest request) {
        LessonProgressResponse response = lessonProgressService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Lesson progress created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody LessonProgressRequest request) {
        LessonProgressResponse response = lessonProgressService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Lesson progress updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LessonProgressResponse>> getById(@PathVariable Long id) {
        LessonProgressResponse response = lessonProgressService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Lesson progress retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LessonProgressResponse>>> getAll() {
        List<LessonProgressResponse> response = lessonProgressService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Lesson progress records retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<LessonProgressResponse>>> getByUserId(@PathVariable Long userId) {
        List<LessonProgressResponse> response = lessonProgressService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Lesson progress records retrieved successfully", response));
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<ApiResponse<List<LessonProgressResponse>>> getByLessonId(@PathVariable Long lessonId) {
        List<LessonProgressResponse> response = lessonProgressService.getByLessonId(lessonId);
        return ResponseEntity.ok(ApiResponse.of("Lesson progress records retrieved successfully", response));
    }

    @GetMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<ApiResponse<List<LessonProgressResponse>>> getByEnrollmentId(@PathVariable Long enrollmentId) {
        List<LessonProgressResponse> response = lessonProgressService.getByEnrollmentId(enrollmentId);
        return ResponseEntity.ok(ApiResponse.of("Lesson progress records retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        lessonProgressService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Lesson progress deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<LessonProgressResponse>>> search(LessonProgressSearchRequest request) {
        Page<LessonProgressResponse> result = lessonProgressService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search LessonProgress successfully", result));
    }
}
