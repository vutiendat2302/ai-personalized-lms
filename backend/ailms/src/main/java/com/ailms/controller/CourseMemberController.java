package com.ailms.controller;

import com.ailms.request.CourseMemberRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CourseMemberResponse;
import com.ailms.service.CourseMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/course-members")
@RequiredArgsConstructor
public class CourseMemberController {

    private final CourseMemberService courseMemberService;

    @PostMapping
    public ResponseEntity<ApiResponse<CourseMemberResponse>> create(@Valid @RequestBody CourseMemberRequest request) {
        CourseMemberResponse response = courseMemberService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course member created successfully", response));
    }

    @PutMapping("/{courseId}/{userId}")
    public ResponseEntity<ApiResponse<CourseMemberResponse>> update(
            @PathVariable Long courseId,
            @PathVariable Long userId,
            @Valid @RequestBody CourseMemberRequest request) {
        CourseMemberResponse response = courseMemberService.update(courseId, userId, request);
        return ResponseEntity.ok(ApiResponse.of("Course member updated successfully", response));
    }

    @GetMapping("/{courseId}/{userId}")
    public ResponseEntity<ApiResponse<CourseMemberResponse>> getById(
            @PathVariable Long courseId,
            @PathVariable Long userId) {
        CourseMemberResponse response = courseMemberService.getById(courseId, userId);
        return ResponseEntity.ok(ApiResponse.of("Course member retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseMemberResponse>>> getAll() {
        List<CourseMemberResponse> response = courseMemberService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Course members retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<ApiResponse<List<CourseMemberResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<CourseMemberResponse> response = courseMemberService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Course members retrieved successfully", response));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<CourseMemberResponse>>> getByUserId(@PathVariable Long userId) {
        List<CourseMemberResponse> response = courseMemberService.getByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Course members retrieved successfully", response));
    }

    @DeleteMapping("/{courseId}/{userId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long courseId,
            @PathVariable Long userId) {
        courseMemberService.delete(courseId, userId);
        return ResponseEntity.ok(ApiResponse.message("Course member deleted successfully"));
    }
}
