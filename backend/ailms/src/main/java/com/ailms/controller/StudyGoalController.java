package com.ailms.controller;

import com.ailms.dto.GoalProgress;
import com.ailms.request.StudyGoalRequest;
import com.ailms.request.StudyGoalSearchRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.StudyGoalResponse;
import com.ailms.service.IStudyGoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/study-goals")
@RequiredArgsConstructor
public class StudyGoalController {

    private final IStudyGoalService studyGoalService;

    @PostMapping
    public ResponseEntity<ApiResponse<StudyGoalResponse>> create(@Valid @RequestBody StudyGoalRequest request) {
        StudyGoalResponse response = studyGoalService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Study goal created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudyGoalResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody StudyGoalRequest request) {
        StudyGoalResponse response = studyGoalService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Study goal updated successfully", response));
    }

    @PostMapping("/{id}/evaluate")
    public ResponseEntity<ApiResponse<GoalProgress>> evaluateGoal(@PathVariable Long id) {
        GoalProgress response = studyGoalService.evaluateGoal(id);
        return ResponseEntity.ok(ApiResponse.of("Study goal evaluated successfully", response));
    }

    @PostMapping("/user/{userId}/evaluate")
    public ResponseEntity<ApiResponse<List<GoalProgress>>> evaluateUserGoals(@PathVariable Long userId) {
        List<GoalProgress> response = studyGoalService.evaluateUserGoals(userId);
        return ResponseEntity.ok(ApiResponse.of("User study goals evaluated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudyGoalResponse>> getById(@PathVariable Long id) {
        StudyGoalResponse response = studyGoalService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Study goal retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudyGoalResponse>>> getAll() {
        List<StudyGoalResponse> response = studyGoalService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Study goals retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<StudyGoalResponse>>> getByUserId(@PathVariable Long userId) {
        List<StudyGoalResponse> response = studyGoalService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Study goals retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<StudyGoalResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<StudyGoalResponse> response = studyGoalService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Study goals retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        studyGoalService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Study goal deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<StudyGoalResponse>>> search(StudyGoalSearchRequest request) {
        PageResponse<StudyGoalResponse> result = studyGoalService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search StudyGoal successfully", result));
    }
}
