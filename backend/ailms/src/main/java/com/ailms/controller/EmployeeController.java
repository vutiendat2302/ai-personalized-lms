package com.ailms.controller;

import com.ailms.request.CreateEmployeeContractRequest;
import com.ailms.request.CreateEmployeeRequest;
import com.ailms.request.EmployeeSearchRequest;
import com.ailms.request.UpdateEmployeeRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.EmployeeResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IEmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final IEmployeeService employeeService;

    @PostMapping
    public ResponseEntity<ApiResponse<EmployeeResponse>> create(@Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse response = employeeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Employee created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeRequest request) {
        EmployeeResponse response = employeeService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Employee updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeResponse>> getById(@PathVariable Long id) {
        EmployeeResponse response = employeeService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Employee retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getAll() {
        List<EmployeeResponse> response = employeeService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Employees retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        employeeService.softDelete(id);
        return ResponseEntity.ok(ApiResponse.message("Employee soft-deleted successfully"));
    }


    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeResponse>>> search(EmployeeSearchRequest request) {
        PageResponse<EmployeeResponse> result = employeeService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Employee successfully", result));
    }

//    Chấm dứt hợp đồng / cho nhân viên nghỉ việc (Terminate)
    @PutMapping("/{id}/terminate")
    public ResponseEntity<ApiResponse<EmployeeResponse>> terminate(@PathVariable Long id) {
        EmployeeResponse response = employeeService.terminate(id);
        return ResponseEntity.ok(ApiResponse.of("Employee terminated successfully", response));
    }

//    Đánh giá kết thúc thời gian thử việc cho nhân viên
    @PostMapping("/{id}/probation-review")
    public ResponseEntity<ApiResponse<EmployeeResponse>> probationReview(
            @PathVariable Long id,
            @RequestParam boolean pass,
            @RequestBody(required = false) CreateEmployeeContractRequest newContractRequest) {
        EmployeeResponse response = employeeService.probationReview(id, pass, newContractRequest);
        return ResponseEntity.ok(ApiResponse.of("Probation review submitted successfully", response));
    }
}
