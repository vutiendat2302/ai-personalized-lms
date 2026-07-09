package com.ailms.controller;

import com.ailms.request.TeachingRateRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.TeachingRateResponse;
import com.ailms.service.TeachingRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/teaching-rates")
@RequiredArgsConstructor
public class TeachingRateController {

    private final TeachingRateService teachingRateService;

    @PostMapping
    public ResponseEntity<ApiResponse<TeachingRateResponse>> create(@Valid @RequestBody TeachingRateRequest request) {
        TeachingRateResponse response = teachingRateService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teaching rate created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TeachingRateResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody TeachingRateRequest request) {
        TeachingRateResponse response = teachingRateService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Teaching rate updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TeachingRateResponse>> getById(@PathVariable Long id) {
        TeachingRateResponse response = teachingRateService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Teaching rate retrieved successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<TeachingRateResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<TeachingRateResponse> response = teachingRateService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Teaching rates retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeachingRateResponse>>> getAll() {
        List<TeachingRateResponse> response = teachingRateService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Teaching rates retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        teachingRateService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Teaching rate deleted successfully"));
    }
}
