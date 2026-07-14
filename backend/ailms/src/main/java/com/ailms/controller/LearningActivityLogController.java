package com.ailms.controller;

import com.ailms.request.LearningActivityLogRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.LearningActivityLogResponse;
import com.ailms.service.LearningActivityLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/learning-activity-logs")
@RequiredArgsConstructor
public class LearningActivityLogController {

    private final LearningActivityLogService learningActivityLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<LearningActivityLogResponse>> create(@Valid @RequestBody LearningActivityLogRequest request) {
        LearningActivityLogResponse response = learningActivityLogService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Learning activity log created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LearningActivityLogResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody LearningActivityLogRequest request) {
        LearningActivityLogResponse response = learningActivityLogService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Learning activity log updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LearningActivityLogResponse>> getById(@PathVariable Long id) {
        LearningActivityLogResponse response = learningActivityLogService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Learning activity log retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LearningActivityLogResponse>>> getAll() {
        List<LearningActivityLogResponse> response = learningActivityLogService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Learning activity logs retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<LearningActivityLogResponse>>> getByUserId(@PathVariable Long userId) {
        List<LearningActivityLogResponse> response = learningActivityLogService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Learning activity logs retrieved successfully", response));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<List<LearningActivityLogResponse>>> getByEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId) {
        List<LearningActivityLogResponse> response = learningActivityLogService.getByEntity(entityType, entityId);
        return ResponseEntity.ok(ApiResponse.of("Learning activity logs retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        learningActivityLogService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Learning activity log deleted successfully"));
    }
}
