package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.LessonResourceSearchRequest;


import com.ailms.response.ApiResponse;
import com.ailms.request.CreateResourceRequest;
import com.ailms.request.UpdateResourceRequest;
import com.ailms.response.ResourceResponse;
import com.ailms.service.ILessonResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/lesson-resources")
@RequiredArgsConstructor
public class LessonResourceController {

    private final ILessonResourceService lessonResourceService;

    @PostMapping("/lessons/{lessonId}/resources")
    public ResponseEntity<ApiResponse<ResourceResponse>> create(
            @PathVariable Long lessonId,
            @Valid @RequestBody CreateResourceRequest request) {
        ResourceResponse response = lessonResourceService.create(lessonId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Resource attached successfully", response));
    }

    @GetMapping("/lessons/{lessonId}/resources")
    public ResponseEntity<ApiResponse<List<ResourceResponse>>> getResourcesByLessonId(@PathVariable Long lessonId) {
        List<ResourceResponse> response = lessonResourceService.getResourcesByLessonId(lessonId);
        return ResponseEntity.ok(ApiResponse.of("Resources retrieved successfully", response));
    }

    @PutMapping("/resources/{id}")
    public ResponseEntity<ApiResponse<ResourceResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateResourceRequest request) {
        ResourceResponse response = lessonResourceService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Resource updated successfully", response));
    }

    @DeleteMapping("/resources/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        lessonResourceService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Resource deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<ResourceResponse>>> search(LessonResourceSearchRequest request) {
        PageResponse<ResourceResponse> result = lessonResourceService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search LessonResource successfully", result));
    }
}
