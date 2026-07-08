package com.ailms.controller;

import com.ailms.request.SalaryRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.SalaryResponse;
import com.ailms.service.SalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/salaries")
@RequiredArgsConstructor
public class SalaryController {

    private final SalaryService salaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<SalaryResponse>> create(@Valid @RequestBody SalaryRequest request) {
        SalaryResponse response = salaryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Salary record created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SalaryResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody SalaryRequest request) {
        SalaryResponse response = salaryService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Salary record updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SalaryResponse>> getById(@PathVariable Long id) {
        SalaryResponse response = salaryService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Salary record retrieved successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<SalaryResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<SalaryResponse> response = salaryService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Salary records retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SalaryResponse>>> getAll() {
        List<SalaryResponse> response = salaryService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Salary records retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        salaryService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Salary record deleted successfully"));
    }
}
