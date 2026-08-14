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

    @PostMapping
    public ResponseEntity<ApiResponse<EmployeeResponse>> create(@Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse response = employeeService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Employee created successfully", response));
    }

    @PostMapping(value = "/onboard", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EmployeeResponse>> onboard(
            @Valid @RequestPart("request") CreateEmployeeRequest request,
            @RequestPart(value = "contractFile", required = false) MultipartFile contractFile) {
        EmployeeResponse response = employeeService.onboard(request, contractFile);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("User, employee and contract created successfully", response));
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

    @GetMapping("/page")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeResponse>>> getEmployeesPage(EmployeeSearchRequest request) {
        PageResponse<EmployeeResponse> result = employeeService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Employees page retrieved successfully", result));
    }

    @PostMapping("/sync-missing-profiles")
    public ResponseEntity<ApiResponse<String>> syncMissingProfiles() {
        employeeService.syncMissingStaffEmployeeProfiles();
        return ResponseEntity.ok(ApiResponse.of("Đồng bộ hồ sơ nhân sự thành công", "Đã đồng bộ toàn bộ tài khoản nhân sự chưa có hồ sơ."));
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

    @GetMapping("/stats/contract-status")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getContractStatusStats(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getContractStatusStats(year);
        return ResponseEntity.ok(ApiResponse.of("Get contract status stats successfully", stats));
    }

    @GetMapping("/stats/expiring-probation-contracts")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Long>> getExpiringProbationCount() {
        long count = employeeService.getExpiringProbationCount();
        return ResponseEntity.ok(ApiResponse.of("Get expiring probation count successfully", count));
    }

    @PostMapping("/stats/notify-expiring-probation")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> notifyExpiringProbation() {
        employeeService.notifyExpiringProbation();
        return ResponseEntity.ok(ApiResponse.message("Sent HR notification for expiring probation contracts successfully"));
    }

    @GetMapping("/stats/roles")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStaffRoleStats(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getStaffRoleStats(year);
        return ResponseEntity.ok(ApiResponse.of("Get staff role stats successfully", stats));
    }

    /**
     * Lấy ra số lượng nhân viên
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> countEmployees() {
        long count = employeeService.countEmployees();
        return ResponseEntity.ok(ApiResponse.of("Get employee count successfully", count));
    }

    /**
     * Số lượng nhân viên theo trạng thái (Real-time)
     */
    @GetMapping("/stats/by-status")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByStatus() {
        Map<String, Long> stats = employeeService.countEmployeesByStatus();
        return ResponseEntity.ok(ApiResponse.of("Get employee count by status successfully", stats));
    }

    /**
     * Số lượng nhân viên theo phòng ban
     */
    @GetMapping("/stats/by-department")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByDepartment(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.countEmployeesByDepartment(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by department successfully", stats));
    }

    /**
     * Số lượng nhân viên theo loại hình hợp đồng
     */
    @GetMapping("/stats/by-employment-type")
    public ResponseEntity<ApiResponse<Map<String, Long>>> countEmployeesByEmploymentType(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.countEmployeesByEmploymentType(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by employment type successfully", stats));
    }

    /**
     * Số lượng nhân viên theo giới tính
     */
    @GetMapping("/stats/by-gender")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getEmployeeStatsByGender(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getEmployeeStatsByGender(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by gender successfully", stats));
    }

    /**
     * Số lượng nhân viên theo độ tuổi
     */
    @GetMapping("/stats/by-age-group")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getEmployeeStatsByAgeGroup(
            @RequestParam(required = false) Integer year) {
        Map<String, Long> stats = employeeService.getEmployeeStatsByAgeGroup(year);
        return ResponseEntity.ok(ApiResponse.of("Get employee count by age group successfully", stats));
    }

    /**
     * Xuất file excel danh sách nhân viên chi tiết
     */
    @GetMapping("/export")
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
    public ResponseEntity<byte[]> exportEmployeeDetailToExcel(@PathVariable Long userId) {
        byte[] excelBytes = employeeService.exportEmployeeDetailToExcel(userId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Employee_Detail_" + userId + "_" + System.currentTimeMillis() + ".csv")
                .contentType(org.springframework.http.MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .body(excelBytes);
    }
}
