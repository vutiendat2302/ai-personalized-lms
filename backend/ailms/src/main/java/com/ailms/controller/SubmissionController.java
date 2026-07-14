package com.ailms.controller;

import com.ailms.request.SubmissionRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.SubmissionResponse;
import com.ailms.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping
    public ResponseEntity<ApiResponse<SubmissionResponse>> create(@Valid @RequestBody SubmissionRequest request) {
        SubmissionResponse response = submissionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Submission created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody SubmissionRequest request) {
        SubmissionResponse response = submissionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Submission updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getById(@PathVariable Long id) {
        SubmissionResponse response = submissionService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Submission retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getAll() {
        List<SubmissionResponse> response = submissionService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Submissions retrieved successfully", response));
    }

    @GetMapping("/assignment/{assignmentId}")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getByAssignmentId(@PathVariable Long assignmentId) {
        List<SubmissionResponse> response = submissionService.getByAssignmentId(assignmentId);
        return ResponseEntity.ok(ApiResponse.of("Submissions retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getByUserId(@PathVariable Long userId) {
        List<SubmissionResponse> response = submissionService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Submissions retrieved successfully", response));
    }

    @GetMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<ApiResponse<List<SubmissionResponse>>> getByEnrollmentId(@PathVariable Long enrollmentId) {
        List<SubmissionResponse> response = submissionService.getByEnrollmentId(enrollmentId);
        return ResponseEntity.ok(ApiResponse.of("Submissions retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        submissionService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Submission deleted successfully"));
    }
}
