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
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final IEmployeeService employeeService;

    /**
     * Tạo mới thông tin hồ sơ nhân viên.
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:create', 'employee_create')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> create(@Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse response = employeeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Employee created successfully", response));
    }

    /**
     * Tạo đồng thời tài khoản người dùng, hồ sơ nhân viên và hợp đồng đầu tiên.
     */
    @PostMapping(value = "/onboard", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:create', 'employee_create')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> onboard(
            @Valid @RequestPart("request") CreateEmployeeRequest request,
            @RequestPart(value = "contractFile", required = false) MultipartFile contractFile) {
        EmployeeResponse response = employeeService.onboard(request, contractFile);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("User, employee and contract created successfully", response));
    }

    /**
     * Cập nhật thông tin hồ sơ nhân viên theo ID.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:update', 'employee_update')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeRequest request) {
        EmployeeResponse response = employeeService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Employee updated successfully", response));
    }

    /**
     * Lấy chi tiết thông tin hồ sơ nhân viên theo ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> getById(@PathVariable Long id) {
        EmployeeResponse response = employeeService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Employee retrieved successfully", response));
    }

    /**
     * Lấy toàn bộ danh sách nhân viên trong hệ thống.
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getAll() {
        List<EmployeeResponse> response = employeeService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Employees retrieved successfully", response));
    }

    /**
     * Xóa mềm hồ sơ nhân viên theo ID.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:delete', 'employee_delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        employeeService.softDelete(id);
        return ResponseEntity.ok(ApiResponse.message("Employee soft-deleted successfully"));
    }

    /**
     * Tìm kiếm phân trang danh sách nhân viên theo tiêu chí.
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeResponse>>> search(EmployeeSearchRequest request) {
        PageResponse<EmployeeResponse> result = employeeService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Employee successfully", result));
    }

    /**
     * Lấy danh sách nhân viên phân trang theo bộ lọc.
     */
    @GetMapping("/page")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeResponse>>> getEmployeesPage(EmployeeSearchRequest request) {
        PageResponse<EmployeeResponse> result = employeeService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Employees page retrieved successfully", result));
    }

    /**
     * Đồng bộ hồ sơ nhân sự còn thiếu cho các tài khoản nhân sự.
     */
    @PostMapping("/sync-missing-profiles")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<String>> syncMissingProfiles() {
        employeeService.syncMissingStaffEmployeeProfiles();
        return ResponseEntity.ok(ApiResponse.of("Đồng bộ hồ sơ nhân sự thành công", "Đã đồng bộ toàn bộ tài khoản nhân sự chưa có hồ sơ."));
    }

    /**
     * Chấm dứt hợp đồng và cho nhân viên nghỉ việc.
     */
    @PutMapping("/{id}/terminate")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:update', 'employee_update', 'employee:delete', 'employee_delete')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> terminate(@PathVariable Long id) {
        EmployeeResponse response = employeeService.terminate(id);
        return ResponseEntity.ok(ApiResponse.of("Employee terminated successfully", response));
    }

    /**
     * Đánh giá kết quả kết thúc thời gian thử việc cho nhân viên.
     */
    @PostMapping("/{id}/probation-review")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:update', 'employee_update', 'contract:approve', 'contract_approve')")
    public ResponseEntity<ApiResponse<EmployeeResponse>> probationReview(
            @PathVariable Long id,
            @RequestParam boolean pass,
            @RequestBody(required = false) CreateEmployeeContractRequest newContractRequest) {
        EmployeeResponse response = employeeService.probationReview(id, pass, newContractRequest);
        return ResponseEntity.ok(ApiResponse.of("Probation review submitted successfully", response));
    }

    /**
     * Lấy thống kê trạng thái hợp đồng nhân viên theo năm.
     */
    @GetMapping("/stats/contract-status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read', 'contract:read', 'contract_read')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getContractStatusStats(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getContractStatusStats(year);
        return ResponseEntity.ok(ApiResponse.of("Get contract status stats successfully", stats));
    }

    /**
     * Lấy số lượng hợp đồng thử việc sắp hết hạn.
     */
    @GetMapping("/stats/expiring-probation-contracts")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read', 'contract:read', 'contract_read')")
    public ResponseEntity<ApiResponse<Long>> getExpiringProbationCount() {
        long count = employeeService.getExpiringProbationCount();
        return ResponseEntity.ok(ApiResponse.of("Get expiring probation count successfully", count));
    }

    /**
     * Gửi thông báo nhắc nhở cho các hợp đồng thử việc sắp hết hạn.
     */
    @PostMapping("/stats/notify-expiring-probation")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:update', 'employee_update', 'contract:update', 'contract_update')")
    public ResponseEntity<ApiResponse<Void>> notifyExpiringProbation() {
        employeeService.notifyExpiringProbation();
        return ResponseEntity.ok(ApiResponse.message("Sent HR notification for expiring probation contracts successfully"));
    }

    /**
     * Lấy thống kê nhân viên theo vai trò chức vụ.
     */
    @GetMapping("/stats/roles")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStaffRoleStats(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getStaffRoleStats(year);
        return ResponseEntity.ok(ApiResponse.of("Get staff role stats successfully", stats));
    }

    /**
     * Lấy ra số lượng nhân viên
     */
    @GetMapping("/count")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<Long>> countEmployees() {
        long count = employeeService.countEmployees();
        return ResponseEntity.ok(ApiResponse.of("Get employee count successfully", count));
    }

    /**
     * Số lượng nhân viên theo trạng thái (Real-time)
     */
    @GetMapping("/stats/by-status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByStatus() {
        Map<String, Long> stats = employeeService.countEmployeesByStatus();
        return ResponseEntity.ok(ApiResponse.of("Get employee count by status successfully", stats));
    }

    /**
     * Số lượng nhân viên theo phòng ban
     */
    @GetMapping("/stats/by-department")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByDepartment(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.countEmployeesByDepartment(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by department successfully", stats));
    }

    /**
     * Số lượng nhân viên theo loại hình hợp đồng
     */
    @GetMapping("/stats/by-employment-type")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByEmploymentType(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.countEmployeesByEmploymentType(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by employment type successfully", stats));
    }

    /**
     * Số lượng nhân viên theo giới tính
     */
    @GetMapping("/stats/by-gender")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getEmployeeStatsByGender(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getEmployeeStatsByGender(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by gender successfully", stats));
    }

    /**
     * Số lượng nhân viên theo độ tuổi
     */
    @GetMapping("/stats/by-age-group")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getEmployeeStatsByAgeGroup(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getEmployeeStatsByAgeGroup(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by age group successfully", stats));
    }

    /**
     * Xuất file excel danh sách nhân viên chi tiết
     */
    @GetMapping("/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<byte[]> exportEmployeeToExcel(EmployeeSearchRequest request) {
        byte[] excelBytes = employeeService.exportEmployeeToExcel(request);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Employee_List_" + System.currentTimeMillis() + ".csv")
                .contentType(org.springframework.http.MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(excelBytes);
    }

    /**
     * Xuất file excel chi tiết 1 nhân sự (gồm tài khoản, hồ sơ cá nhân nhân viên và hệ thống)
     */
    @GetMapping("/{userId}/export-detail")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'employee:read', 'employee_read')")
    public ResponseEntity<byte[]> exportEmployeeDetailToExcel(@PathVariable Long userId) {
        byte[] excelBytes = employeeService.exportEmployeeDetailToExcel(userId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Employee_Detail_" + userId + "_" + System.currentTimeMillis() + ".csv")
                .contentType(org.springframework.http.MediaType.parseMediaType("text/csv;charset=UTF-8"))
        .body(excelBytes);
    }
}
