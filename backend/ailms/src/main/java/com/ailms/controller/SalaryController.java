package com.ailms.controller;

import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.SalarySearchRequest;
import com.ailms.response.SalaryResponse;

import com.ailms.response.ApiResponse;
import com.ailms.service.ISalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/salaries")
@RequiredArgsConstructor
public class SalaryController {

    private final ISalaryService salaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<SalaryResponse>> create(@Valid @RequestBody CreateSalaryRequest request) {
        SalaryResponse response = salaryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Salary record created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SalaryResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSalaryRequest request) {
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

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<SalaryResponse>>> search(SalarySearchRequest request) {
         PageResponse<SalaryResponse> result = salaryService.search(request);
         return ResponseEntity.ok(ApiResponse.of("Search Salary successfully", result));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<SalaryResponse>> approve(@PathVariable Long id) {
        SalaryResponse response = salaryService.approve(id);
        return ResponseEntity.ok(ApiResponse.of("Salary approved successfully", response));
    }

    @PutMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<SalaryResponse>> pay(@PathVariable Long id) {
        SalaryResponse response = salaryService.pay(id);
        return ResponseEntity.ok(ApiResponse.of("Salary paid successfully", response));
    }
}
