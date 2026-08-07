package com.ailms.controller;

import com.ailms.request.CreateClassResourceRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassResourceResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IClassResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/classes/{classId}/resources")
@RequiredArgsConstructor
public class ClassResourceController {

    private final IClassResourceService resourceService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClassResourceResponse>> createResource(
            @PathVariable Long classId,
            @Valid @RequestBody CreateClassResourceRequest request) {
        ClassResourceResponse response = resourceService.createResource(classId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Class resource created successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ClassResourceResponse>>> getResourcesPage(
            @PathVariable Long classId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResponse<ClassResourceResponse> response = resourceService.getResourcesPage(classId, keyword, page, size);
        return ResponseEntity.ok(ApiResponse.of("Class resources retrieved successfully", response));
    }

    @DeleteMapping("/{resourceId}")
    public ResponseEntity<ApiResponse<Void>> deleteResource(@PathVariable Long resourceId) {
        resourceService.deleteResource(resourceId);
        return ResponseEntity.ok(ApiResponse.message("Class resource deleted successfully"));
    }
}
