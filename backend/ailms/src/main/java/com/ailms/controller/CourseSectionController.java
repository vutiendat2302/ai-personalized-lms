package com.ailms.controller;

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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CourseSectionController {

    private final ICourseSectionService courseSectionService;

    @PostMapping("/courses/{courseId}/sections")
    public ResponseEntity<ApiResponse<SectionResponse>> create(
            @PathVariable Long courseId,
            @Valid @RequestBody CreateSectionRequest request) {
        SectionResponse response = courseSectionService.create(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Section created successfully", response));
    }

    @GetMapping("/courses/{courseId}/sections")
    public ResponseEntity<ApiResponse<List<SectionResponse>>> getSectionsByCourseId(@PathVariable Long courseId) {
        List<SectionResponse> response = courseSectionService.getSectionsByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Sections retrieved successfully", response));
    }

    @PutMapping("/sections/{id}")
    public ResponseEntity<ApiResponse<SectionResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSectionRequest request) {
        SectionResponse response = courseSectionService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Section updated successfully", response));
    }

    @DeleteMapping("/sections/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        courseSectionService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Section deleted successfully"));
    }

    @PatchMapping("/sections/reorder")
    public ResponseEntity<ApiResponse<Void>> reorder(@Valid @RequestBody ReorderRequest request) {
        courseSectionService.reorder(request);
        return ResponseEntity.ok(ApiResponse.message("Sections reordered successfully"));
    }
}
