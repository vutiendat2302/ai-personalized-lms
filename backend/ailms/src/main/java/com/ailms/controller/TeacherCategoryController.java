package com.ailms.controller;

import com.ailms.request.AssignTeacherRequest;
import com.ailms.request.CreateTeacherCategoryRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.TeacherCategoryResponse;
import com.ailms.service.ITeacherCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/teacher_categories")
@RequiredArgsConstructor
public class TeacherCategoryController {

    private final ITeacherCategoryService teacherCategoryService;

    @PostMapping("/teacher-categories")
    public ResponseEntity<ApiResponse<TeacherCategoryResponse>> create(@Valid @RequestBody CreateTeacherCategoryRequest request) {
        TeacherCategoryResponse response = teacherCategoryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teacher category association created successfully", response));
    }

    @PostMapping("/categories/{id}/teachers")
    public ResponseEntity<ApiResponse<TeacherCategoryResponse>> assignTeacherToCategory(
            @PathVariable Long id,
            @Valid @RequestBody AssignTeacherRequest request,
            @RequestParam(required = false) Long adminUserId) {
        TeacherCategoryResponse response = teacherCategoryService.assignTeacherToCategory(id, request.getEmployeeId(), adminUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teacher assigned to category successfully", response));
    }

    @DeleteMapping("/categories/{id}/teachers/{employeeId}")
    public ResponseEntity<ApiResponse<Void>> unassignTeacherFromCategory(
            @PathVariable Long id,
            @PathVariable Long employeeId) {
        teacherCategoryService.unassignTeacherFromCategory(id, employeeId);
        return ResponseEntity.ok(ApiResponse.message("Teacher unassigned from category successfully"));
    }

    @GetMapping("/teacher-categories")
    public ResponseEntity<ApiResponse<List<TeacherCategoryResponse>>> getAll() {
        List<TeacherCategoryResponse> response = teacherCategoryService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Teacher categories retrieved successfully", response));
    }

    @GetMapping("/teacher-categories/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<TeacherCategoryResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<TeacherCategoryResponse> response = teacherCategoryService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Teacher categories retrieved successfully", response));
    }

    @DeleteMapping("/teacher-categories/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        teacherCategoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Teacher category association deleted successfully"));
    }
}
