package com.ailms.controller;

import com.ailms.entity.enums.SalaryStatusEnum;
import com.ailms.request.CreateSalaryRequest;
import com.ailms.request.GenerateSalaryPeriodRequest;
import com.ailms.request.SalarySearchRequest;
import com.ailms.request.UpdateSalaryRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.SalaryResponse;
import com.ailms.response.SalarySummaryResponse;
import com.ailms.service.ISalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("${api.prefix}/salaries")
@RequiredArgsConstructor
public class SalaryController {

    private final ISalaryService salaryService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SalarySummaryResponse>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        SalarySummaryResponse summary = salaryService.getSummary(period);
        return ResponseEntity.ok(ApiResponse.of("Retrieved salary summary successfully", summary));
    }

    @PostMapping("/generate-period")
    public ResponseEntity<ApiResponse<Integer>> generatePeriod(@Valid @RequestBody GenerateSalaryPeriodRequest request) {
        int count = salaryService.generatePeriod(request);
        return ResponseEntity.ok(ApiResponse.of("Generated salary slips successfully", count));
    }

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
    public ResponseEntity<ApiResponse<PageResponse<SalaryResponse>>> getAll(SalarySearchRequest request) {
        PageResponse<SalaryResponse> result = salaryService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Salary records retrieved successfully", result));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<SalaryResponse>>> search(SalarySearchRequest request) {
        PageResponse<SalaryResponse> result = salaryService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Salary successfully", result));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        salaryService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Salary record deleted successfully"));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<SalaryResponse>> approvePatch(@PathVariable Long id) {
        SalaryResponse response = salaryService.approve(id);
        return ResponseEntity.ok(ApiResponse.of("Salary approved successfully", response));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<SalaryResponse>> approvePut(@PathVariable Long id) {
        SalaryResponse response = salaryService.approve(id);
        return ResponseEntity.ok(ApiResponse.of("Salary approved successfully", response));
    }

    @PostMapping("/bulk-approve")
    public ResponseEntity<ApiResponse<Void>> bulkApprove(@RequestBody List<Long> ids) {
        salaryService.bulkApprove(ids);
        return ResponseEntity.ok(ApiResponse.message("Bulk approved salaries successfully"));
    }

    @PatchMapping("/{id}/mark-paid")
    public ResponseEntity<ApiResponse<SalaryResponse>> markPaidPatch(@PathVariable Long id) {
        SalaryResponse response = salaryService.markPaid(id);
        return ResponseEntity.ok(ApiResponse.of("Salary marked as paid successfully", response));
    }

    @PutMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<SalaryResponse>> payPut(@PathVariable Long id) {
        SalaryResponse response = salaryService.pay(id);
        return ResponseEntity.ok(ApiResponse.of("Salary paid successfully", response));
    }

    @PostMapping("/bulk-mark-paid")
    public ResponseEntity<ApiResponse<Void>> bulkMarkPaid(@RequestBody List<Long> ids) {
        salaryService.bulkMarkPaid(ids);
        return ResponseEntity.ok(ApiResponse.message("Bulk marked paid salaries successfully"));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth period,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) SalaryStatusEnum status) {
        byte[] csvData = salaryService.exportCsv(period, departmentId, status);
        String filename = "Bao_Cao_Luong_" + (period != null ? period : YearMonth.now()) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=utf-8"))
                .body(csvData);
    }
}
