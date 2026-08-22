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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final IDepartmentService departmentService;

    /**
     * Tạo mới thông tin phòng ban.
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:create', 'department_create')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> create(
            @Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentResponse response = departmentService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Department created successfully", response));
    }

    /**
     * Cập nhật thông tin phòng ban theo ID.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:update', 'department_update')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDepartmentRequest request) {
        DepartmentResponse response = departmentService.updateDepartment(id, request);
        return ResponseEntity.ok(ApiResponse.of("Department updated successfully", response));
    }

    /**
     * Xóa phòng ban theo ID.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:delete', 'department_delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Department deleted successfully"));
    }

    /**
     * Lấy chi tiết thông tin phòng ban theo ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:read', 'department_read')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> getById(@PathVariable Long id) {
        DepartmentResponse response = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * Lấy toàn bộ danh sách phòng ban trong hệ thống.
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:read', 'department_read')")
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getAll() {
        List<DepartmentResponse> response = departmentService.getDepartments();
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * Tìm kiếm và phân trang danh sách phòng ban.
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:read', 'department_read')")
    public ResponseEntity<ApiResponse<PageResponse<DepartmentResponse>>> search(DepartmentSearchRequest request) {
        PageResponse<DepartmentResponse> response = departmentService.search(request);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * Lấy danh sách nhân viên thuộc một phòng ban.
     */
    @GetMapping("/{id}/employees")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:read', 'department_read', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getEmployeesByDepartmentId(@PathVariable Long id) {
        List<EmployeeResponse> response = departmentService.getEmployeesByDepartmentId(id);
        return ResponseEntity.ok(ApiResponse.of("Employees in department retrieved successfully", response));
    }

    /**
     * Lấy thống kê tổng quan về phòng ban.
     */
    @GetMapping("/stats/overview")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:read', 'department_read')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverviewStats(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(ApiResponse.of("Department overview stats", departmentService.getDepartmentOverviewStats(year)));
    }

    /**
     * Chuyển danh sách nhân viên sang phòng ban đích.
     */
    @PostMapping("/transfer-employees")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:update', 'department_update')")
    public ResponseEntity<ApiResponse<Void>> transferEmployees(@RequestParam Long targetDeptId, @RequestBody List<Long> employeeIds) {
        departmentService.transferEmployees(targetDeptId, employeeIds);
        return ResponseEntity.ok(ApiResponse.message("Employees transferred successfully"));
    }

    /**
     * Xóa danh sách nhân viên khỏi phòng ban hiện tại.
     */
    @PostMapping("/remove-employees")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'department:update', 'department_update')")
    public ResponseEntity<ApiResponse<Void>> removeEmployees(@RequestBody List<Long> employeeIds) {
        departmentService.removeEmployeesFromDepartment(employeeIds);
        return ResponseEntity.ok(ApiResponse.message("Employees removed from department successfully"));
    }
}

