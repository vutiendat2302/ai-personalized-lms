package com.ailms.controller;

import com.ailms.request.EmployeeContractRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.EmployeeContractResponse;
import com.ailms.service.EmployeeContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/employee-contracts")
@RequiredArgsConstructor
public class EmployeeContractController {

    private final EmployeeContractService employeeContractService;

    @PostMapping
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> create(@Valid @RequestBody EmployeeContractRequest request) {
        EmployeeContractResponse response = employeeContractService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Employee contract created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeContractRequest request) {
        EmployeeContractResponse response = employeeContractService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Employee contract updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> getById(@PathVariable Long id) {
        EmployeeContractResponse response = employeeContractService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Employee contract retrieved successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<EmployeeContractResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<EmployeeContractResponse> response = employeeContractService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Employee contracts retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmployeeContractResponse>>> getAll() {
        List<EmployeeContractResponse> response = employeeContractService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Employee contracts retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        employeeContractService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Employee contract deleted successfully"));
    }
}
