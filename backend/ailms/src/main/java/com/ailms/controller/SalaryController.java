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
import com.ailms.response.PayrollBatchResponse;
import com.ailms.service.ISalaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/salaries")
@RequiredArgsConstructor
public class SalaryController {

    private final ISalaryService salaryService;

    @GetMapping("/payroll-trash")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<SalaryResponse>>> getPayrollTrash() {
        return ResponseEntity.ok(ApiResponse.of("Retrieved payroll trash", salaryService.getTrash()));
    }

    @PostMapping("/payroll-trash/{period}/restore")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> restorePayroll(@PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Payroll restored", salaryService.restorePayroll(period)));
    }

    @DeleteMapping("/payroll-trash/{period}/hard")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> hardDeletePayroll(@PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Payroll permanently deleted", salaryService.hardDeletePayroll(period)));
    }

    @GetMapping("/payroll-batches")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<List<PayrollBatchResponse>>> getPayrollBatches(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth periodFrom,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth periodTo) {
        return ResponseEntity.ok(ApiResponse.of("Retrieved payroll batches successfully",
                salaryService.getPayrollBatches(periodFrom, periodTo)));
    }

    @PostMapping("/payroll-batches/{period}/submit")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Integer>> submitPayroll(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Payroll submitted for approval", salaryService.submitPayroll(period)));
    }

    @PostMapping("/payroll-batches/{period}/cancel-submission")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    public ResponseEntity<ApiResponse<Integer>> cancelPayrollSubmission(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Payroll submission cancelled",
                salaryService.cancelPayrollSubmission(period)));
    }

    @PostMapping("/payroll-batches/{period}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> approvePayroll(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Payroll approved", salaryService.approvePayroll(period)));
    }

    @PostMapping("/payroll-batches/{period}/reject")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> rejectPayroll(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period,
            @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(ApiResponse.of("Payroll rejected",
                salaryService.rejectPayroll(period, payload.get("reason"))));
    }

    @PostMapping("/payroll-batches/{period}/resubmit")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Integer>> resubmitPayroll(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Payroll resubmitted", salaryService.resubmitPayroll(period)));
    }

    @DeleteMapping("/payroll-batches/{period}/draft")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Integer>> deleteDraftPayroll(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Draft payroll deleted", salaryService.deleteDraftPayroll(period)));
    }

    @DeleteMapping("/payroll-batches/{period}/approved")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> deleteApprovedPayroll(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Approved payroll deleted", salaryService.deleteApprovedPayroll(period)));
    }

    @PostMapping(value = "/payroll-batches/{period}/export-transfer", produces = "text/csv")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<byte[]> exportTransferList(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=payroll-transfer-" + period + ".csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(salaryService.exportTransferList(period));
    }

    @PostMapping("/payroll-batches/{period}/mark-paid")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Integer>> markPayrollPaid(
            @PathVariable @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        return ResponseEntity.ok(ApiResponse.of("Payroll marked as paid", salaryService.markPayrollPaid(period)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<SalarySummaryResponse>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth period) {
        SalarySummaryResponse summary = salaryService.getSummary(period);
        return ResponseEntity.ok(ApiResponse.of("Retrieved salary summary successfully", summary));
    }

    @GetMapping("/summary-range")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<SalarySummaryResponse>> getSummaryRange(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth periodFrom,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth periodTo) {
        return ResponseEntity.ok(ApiResponse.of("Retrieved salary range summary successfully",
                salaryService.getSummaryRange(periodFrom, periodTo)));
    }

    @PostMapping("/generate-period")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Integer>> generatePeriod(@Valid @RequestBody GenerateSalaryPeriodRequest request) {
        int count = salaryService.generatePeriod(request);
        return ResponseEntity.ok(ApiResponse.of("Generated salary slips successfully", count));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<SalaryResponse>> create(@Valid @RequestBody CreateSalaryRequest request) {
        SalaryResponse response = salaryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Salary record created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<PageResponse<SalaryResponse>>> getAll(SalarySearchRequest request) {
        PageResponse<SalaryResponse> result = salaryService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Salary records retrieved successfully", result));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<PageResponse<SalaryResponse>>> search(SalarySearchRequest request) {
        PageResponse<SalaryResponse> result = salaryService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Salary successfully", result));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        salaryService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Salary record deleted successfully"));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<SalaryResponse>> approvePatch(@PathVariable Long id) {
        SalaryResponse response = salaryService.approve(id);
        return ResponseEntity.ok(ApiResponse.of("Salary approved successfully", response));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<SalaryResponse>> approvePut(@PathVariable Long id) {
        SalaryResponse response = salaryService.approve(id);
        return ResponseEntity.ok(ApiResponse.of("Salary approved successfully", response));
    }

    @PostMapping("/bulk-approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> bulkApprove(@RequestBody List<Long> ids) {
        salaryService.bulkApprove(ids);
        return ResponseEntity.ok(ApiResponse.message("Bulk approved salaries successfully"));
    }

    @PatchMapping("/{id}/mark-paid")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<SalaryResponse>> markPaidPatch(@PathVariable Long id) {
        SalaryResponse response = salaryService.markPaid(id);
        return ResponseEntity.ok(ApiResponse.of("Salary marked as paid successfully", response));
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<SalaryResponse>> payPut(@PathVariable Long id) {
        SalaryResponse response = salaryService.pay(id);
        return ResponseEntity.ok(ApiResponse.of("Salary paid successfully", response));
    }

    @PostMapping("/bulk-mark-paid")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> bulkMarkPaid(@RequestBody List<Long> ids) {
        salaryService.bulkMarkPaid(ids);
        return ResponseEntity.ok(ApiResponse.message("Bulk marked paid salaries successfully"));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
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

    @GetMapping("/export-range")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
    public ResponseEntity<byte[]> exportCsvRange(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth periodFrom,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth periodTo,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) SalaryStatusEnum status) {
        byte[] csvData = salaryService.exportCsvRange(periodFrom, periodTo, departmentId, status);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Bao_Cao_Luong_" + periodFrom + "_" + periodTo + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=utf-8"))
                .body(csvData);
    }
}
