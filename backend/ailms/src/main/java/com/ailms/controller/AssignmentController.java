package com.ailms.controller;

import com.ailms.request.AssignmentRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.AssignmentResponse;
import com.ailms.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<AssignmentResponse>> create(@Valid @RequestBody AssignmentRequest request) {
        AssignmentResponse response = assignmentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Assignment created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody AssignmentRequest request) {
        AssignmentResponse response = assignmentService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Assignment updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> getById(@PathVariable Long id) {
        AssignmentResponse response = assignmentService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Assignment retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> getAll() {
        List<AssignmentResponse> response = assignmentService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Assignments retrieved successfully", response));
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> getByLessonId(@PathVariable Long lessonId) {
        List<AssignmentResponse> response = assignmentService.getByLessonId(lessonId);
        return ResponseEntity.ok(ApiResponse.of("Assignments retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<AssignmentResponse> response = assignmentService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Assignments retrieved successfully", response));
    }

    @GetMapping("/section/{sectionId}")
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> getBySectionId(@PathVariable Long sectionId) {
        List<AssignmentResponse> response = assignmentService.getBySectionId(sectionId);
        return ResponseEntity.ok(ApiResponse.of("Assignments retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        assignmentService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Assignment deleted successfully"));
    }
}
