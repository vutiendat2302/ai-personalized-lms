package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.LessonSearchRequest;
import com.ailms.response.LessonResponse;


import com.ailms.response.ApiResponse;
import com.ailms.request.CreateLessonRequest;
import com.ailms.request.UpdateLessonRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.LessonResponse;
import com.ailms.service.ILessonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final ILessonService lessonService;

    @PostMapping("/sections/{sectionId}/lessons")
    public ResponseEntity<ApiResponse<LessonResponse>> create(
            @PathVariable Long sectionId,
            @Valid @RequestBody CreateLessonRequest request) {
        LessonResponse response = lessonService.create(sectionId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Lesson created successfully", response));
    }

    @GetMapping("/sections/{sectionId}/lessons")
    public ResponseEntity<ApiResponse<List<LessonResponse>>> getLessonsBySectionId(@PathVariable Long sectionId) {
        List<LessonResponse> response = lessonService.getLessonsBySectionId(sectionId);
        return ResponseEntity.ok(ApiResponse.of("Lessons retrieved successfully", response));
    }

    @GetMapping("/lessons/{id}")
    public ResponseEntity<ApiResponse<LessonResponse>> getById(@PathVariable Long id) {
        LessonResponse response = lessonService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Lesson retrieved successfully", response));
    }

    @PutMapping("/lessons/{id}")
    public ResponseEntity<ApiResponse<LessonResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLessonRequest request) {
        LessonResponse response = lessonService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Lesson updated successfully", response));
    }

    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        lessonService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Lesson deleted successfully"));
    }

    @PatchMapping("/lessons/reorder")
    public ResponseEntity<ApiResponse<Void>> reorder(@Valid @RequestBody ReorderRequest request) {
        lessonService.reorder(request);
        return ResponseEntity.ok(ApiResponse.message("Lessons reordered successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<LessonResponse>>> search(LessonSearchRequest request) {
        PageResponse<LessonResponse> result = lessonService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Lesson successfully", result));
    }
}
