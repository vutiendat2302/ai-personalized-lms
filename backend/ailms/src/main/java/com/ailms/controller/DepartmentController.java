package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.ApiResponse;
import com.ailms.response.DepartmentResponse;
import com.ailms.response.EmployeeResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IDepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final IDepartmentService departmentService;

    @PostMapping
    public ResponseEntity<ApiResponse<DepartmentResponse>> create(
            @Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentResponse response = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Department created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DepartmentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDepartmentRequest request) {
        DepartmentResponse response = departmentService.updateDepartment(id, request);
        return ResponseEntity.ok(ApiResponse.of("Department updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Department deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DepartmentResponse>> getById(@PathVariable Long id) {
        DepartmentResponse response = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getAll() {
        List<DepartmentResponse> response = departmentService.getDepartments();
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<DepartmentResponse>>> search(DepartmentSearchRequest request) {
        PageResponse<DepartmentResponse> response = departmentService.search(request);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/{id}/employees")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getEmployeesByDepartmentId(@PathVariable Long id) {
        List<EmployeeResponse> response = departmentService.getEmployeesByDepartmentId(id);
        return ResponseEntity.ok(ApiResponse.of("Employees in department retrieved successfully", response));
    }

    @GetMapping("/stats/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverviewStats(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(ApiResponse.of("Department overview stats", departmentService.getDepartmentOverviewStats(year)));
    }

    @PostMapping("/transfer-employees")
    public ResponseEntity<ApiResponse<Void>> transferEmployees(@RequestParam Long targetDeptId, @RequestBody List<Long> employeeIds) {
        departmentService.transferEmployees(targetDeptId, employeeIds);
        return ResponseEntity.ok(ApiResponse.message("Employees transferred successfully"));
    }

    @PostMapping("/remove-employees")
    public ResponseEntity<ApiResponse<Void>> removeEmployees(@RequestBody List<Long> employeeIds) {
        departmentService.removeEmployeesFromDepartment(employeeIds);
        return ResponseEntity.ok(ApiResponse.message("Employees removed from department successfully"));
    }
}

