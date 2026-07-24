package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.CourseSectionSearchRequest;


import com.ailms.response.ApiResponse;
import com.ailms.request.CreateSectionRequest;
import com.ailms.request.UpdateSectionRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.SectionResponse;
import com.ailms.service.ICourseSectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/sections")
@RequiredArgsConstructor
public class CourseSectionController {

    private final ICourseSectionService courseSectionService;

    @PostMapping("/section")
    public ResponseEntity<ApiResponse<SectionResponse>> create(@Valid @RequestBody CreateSectionRequest request) {
        SectionResponse response = courseSectionService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Section created successfully", response));
    }

    @GetMapping({"/{courseId}/sections", "/course/{courseId}", "/{courseId}"})
    public ResponseEntity<ApiResponse<List<SectionResponse>>> getSectionsByCourseId(@PathVariable Long courseId) {
        List<SectionResponse> response = courseSectionService.getSectionsByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Sections retrieved successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SectionResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSectionRequest request) {
        SectionResponse response = courseSectionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Section updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        courseSectionService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Section deleted successfully"));
    }

    // Đổi thứ tự
    @PatchMapping("/sections/reorder")
    public ResponseEntity<ApiResponse<Void>> reorder(@Valid @RequestBody ReorderRequest request) {
        courseSectionService.reorder(request);
        return ResponseEntity.ok(ApiResponse.message("Sections reordered successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SectionResponse>> getById(@PathVariable Long id) {
        SectionResponse response = courseSectionService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Section retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SectionResponse>>> getAll() {
        List<SectionResponse> response= courseSectionService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Sections retrieved successfully", response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<SectionResponse>>> search(CourseSectionSearchRequest request) {
        PageResponse<SectionResponse> result = courseSectionService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search CourseSection successfully", result));
    }
}
