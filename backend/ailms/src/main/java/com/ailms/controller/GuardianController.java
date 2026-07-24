package com.ailms.controller;

import com.ailms.request.UpdateGuardianRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.GuardianSearchRequest;
import com.ailms.response.GuardianResponse;


import com.ailms.request.CreateGuardianRequest;
import com.ailms.response.ApiResponse;
import com.ailms.service.IGuardianService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/guardians")
@RequiredArgsConstructor
public class GuardianController {

    private final IGuardianService guardianService;

    @PostMapping
    public ResponseEntity<ApiResponse<GuardianResponse>> create(@Valid @RequestBody CreateGuardianRequest request) {
        GuardianResponse response = guardianService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Guardian created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GuardianResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateGuardianRequest request) {
        GuardianResponse response = guardianService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Guardian updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GuardianResponse>> getById(@PathVariable Long id) {
        GuardianResponse response = guardianService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Guardian retrieved successfully", response));
    }

    @GetMapping("/student/{studentUserId}")
    public ResponseEntity<ApiResponse<List<GuardianResponse>>> getByStudentUserId(@PathVariable Long studentUserId) {
        List<GuardianResponse> response = guardianService.getByStudentUserId(studentUserId);
        return ResponseEntity.ok(ApiResponse.of("Guardians retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<GuardianResponse>>> getAll() {
        List<GuardianResponse> response = guardianService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Guardians retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        guardianService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Guardian deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<GuardianResponse>>> search(GuardianSearchRequest request) {
        PageResponse<GuardianResponse> result = guardianService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Guardian successfully", result));
    }
}
