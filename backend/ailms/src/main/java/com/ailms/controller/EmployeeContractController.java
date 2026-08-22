package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.service.IEmployeeContractService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;

/**
 * Controller tiếp nhận các yêu cầu HTTP quản lý hợp đồng lao động nhân viên.
 * Hỗ trợ các route chuẩn hoá `/contracts` (và alias `/employee-contracts`).
 */
@RestController
@RequestMapping({"${api.prefix}/contracts", "${api.prefix}/employee-contracts"})
@RequiredArgsConstructor
public class EmployeeContractController {

    private final IEmployeeContractService employeeContractService;

    /**
     * [1.1] GET /contracts/employee/{employeeId}/active-check
     * Kiểm tra xem nhân viên hiện tại có hợp đồng nào ở trạng thái ACTIVE hay không.
     */
    @GetMapping("/employee/{employeeId}/active-check")
    public ResponseEntity<ApiResponse<ActiveContractCheckResponse>> checkActiveContract(@PathVariable Long employeeId) {
        ActiveContractCheckResponse response = employeeContractService.checkActiveContract(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Active contract status checked successfully", response));
    }

    /**
     * [1.2] PATCH /contracts/{id}/terminate
     * Chấm dứt hợp đồng đang hiệu lực (status = TERMINATED, set terminatedAt & terminationReason).
     */
    @PatchMapping("/{id}/terminate")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> terminateContract(
            @PathVariable Long id,
            @RequestBody(required = false) TerminateContractRequest request) {
        EmployeeContractResponse response = employeeContractService.terminateContract(id, request);
        return ResponseEntity.ok(ApiResponse.of("Contract terminated successfully", response));
    }

    /**
     * [2.1 - Bước A1] POST /contracts
     * Khởi tạo bản ghi hợp đồng mới ở trạng thái ACTIVE (chưa đính kèm file).
     */
    @PostMapping
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> create(@Valid @RequestBody CreateEmployeeContractRequest request) {
        EmployeeContractResponse response = employeeContractService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Employee contract created successfully", response));
    }

    /**
     * [2.1 - Bước A2] POST /contracts/{id}/upload-file (multipart/form-data)
     * Upload file hợp đồng đính kèm sẵn có (.pdf, .docx, <= 10MB) và gắn vào hợp đồng.
     */
    @PostMapping(value = "/{id}/upload-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> uploadContractFile(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        EmployeeContractResponse response = employeeContractService.uploadContractFile(id, file);
        return ResponseEntity.ok(ApiResponse.of("Contract file uploaded successfully", response));
    }

    /**
     * [2.2 - Bước B3] POST /contracts/generate
     * Sinh file PDF tự động từ HTML template, upload MinIO và tạo hợp đồng trong cùng 1 Transaction.
     */
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> generateContract(@Valid @RequestBody GenerateEmployeeContractRequest request) {
        EmployeeContractResponse response = employeeContractService.generateContract(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Employee contract generated and created successfully", response));
    }

    /**
     * GET /contracts/{id}/download-url
     * Lấy Presigned URL xem/tải tệp hợp đồng an toàn từ MinIO (hạn dùng 24 tiếng).
     */
    @GetMapping("/{id}/download-url")
    public ResponseEntity<ApiResponse<Map<String, String>>> getDownloadUrl(@PathVariable Long id) {
        String url = employeeContractService.getContractDownloadUrl(id);
        return ResponseEntity.ok(ApiResponse.of("Presigned download URL generated successfully", Map.of("downloadUrl", url)));
    }

    /**
     * PUT /contracts/{id}
     * Cập nhật thông tin hợp đồng đã có.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmployeeContractRequest request) {
        EmployeeContractResponse response = employeeContractService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Employee contract updated successfully", response));
    }

    /**
     * GET /contracts/{id}
     * Lấy chi tiết thông tin 1 hợp đồng theo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> getById(@PathVariable Long id) {
        EmployeeContractResponse response = employeeContractService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Employee contract retrieved successfully", response));
    }

    /**
     * GET /contracts/employee/{employeeId}
     * Lấy danh sách toàn bộ hợp đồng của 1 nhân viên.
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<EmployeeContractResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<EmployeeContractResponse> response = employeeContractService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Employee contracts retrieved successfully", response));
    }

    /**
     * GET /contracts
     * Lấy tất cả hợp đồng trong hệ thống.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<EmployeeContractResponse>>> getAll() {
        List<EmployeeContractResponse> response = employeeContractService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Employee contracts retrieved successfully", response));
    }

    /**
     * DELETE /contracts/{id}
     * Xóa hợp đồng khỏi hệ thống.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        employeeContractService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Employee contract deleted successfully"));
    }

    @DeleteMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<Void>> deleteAllByEmployeeId(@PathVariable Long employeeId) {
        employeeContractService.deleteAllByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.message("All employee contracts and files deleted permanently"));
    }

    @PostMapping("/bulk-remind-expiration")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkRemindExpiration(
            @Valid @RequestBody BulkContractReminderRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Contract reminders sent successfully",
                employeeContractService.sendBulkExpirationReminder(request)));
    }

    @GetMapping("/reminder-recipients")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getReminderRecipients() {
        return ResponseEntity.ok(ApiResponse.of("HR reminder recipients retrieved successfully",
                employeeContractService.getReminderRecipients()));
    }

    @GetMapping("/expiring-probation")
    public ResponseEntity<ApiResponse<List<EmployeeContractResponse>>> getExpiringProbationContracts() {
        return ResponseEntity.ok(ApiResponse.of("Expiring probation contracts retrieved successfully",
                employeeContractService.getExpiringProbationContracts()));
    }

    @PostMapping(value = "/bulk-download-zip", produces = "application/zip")
    public ResponseEntity<byte[]> bulkDownloadZip(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.getOrDefault("ids", List.of());
        byte[] zip = employeeContractService.downloadContractsZip(ids);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=hop_dong_da_chon.zip")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zip);
    }

    /**
     * GET /contracts/search
     * Tìm kiếm phân trang hợp đồng theo tiêu chí lọc.
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<EmployeeContractResponse>>> search(EmployeeContractSearchRequest request) {
        PageResponse<EmployeeContractResponse> result = employeeContractService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search EmployeeContract successfully", result));
    }

    /**
     * [Ký điện tử - Bước 1] POST /contracts/{id}/sign-company
     * HR/Admin ký xác nhận phía công ty -> Chuyển signingStatus = PENDING_EMPLOYEE_SIGN, sinh token & gửi email.
     */
    @PostMapping("/{id}/sign-company")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> signCompany(
            @PathVariable Long id,
            @RequestBody(required = false) SignCompanyRequest request) {
        EmployeeContractResponse response = employeeContractService.signCompany(id, request);
        return ResponseEntity.ok(ApiResponse.of("Company contract signing confirmed. Signing link sent to employee email.", response));
    }

    /**
     * [Ký điện tử - Bước 2] GET /contracts/sign/{signingToken} (PUBLIC)
     * Nhân viên mở link ký công khai -> Xem trước hợp đồng và nhận mã OTP 6 chữ số qua Email.
     */
    @GetMapping("/sign/{signingToken}")
    public ResponseEntity<ApiResponse<ContractSigningLinkResponse>> getPublicSigningInfo(@PathVariable String signingToken) {
        ContractSigningLinkResponse response = employeeContractService.getPublicSigningInfo(signingToken);
        return ResponseEntity.ok(ApiResponse.of("Public signing contract details retrieved successfully", response));
    }

    /**
     * [Ký điện tử - Bước 3] POST /contracts/sign/{signingToken}/confirm (PUBLIC)
     * Nhân viên nhập mã OTP + chữ ký vẽ tay -> Chốt hợp đồng FULLY_SIGNED và nhận tệp PDF chứng nhận.
     */
    @PostMapping("/sign/{signingToken}/confirm")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> confirmEmployeeSigning(
            @PathVariable String signingToken,
            @Valid @RequestBody SignEmployeeConfirmRequest request,
            HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty()) {
            ipAddress = httpRequest.getRemoteAddr();
        }
        String userAgent = httpRequest.getHeader("User-Agent");

        EmployeeContractResponse response = employeeContractService.confirmEmployeeSigning(signingToken, request, ipAddress, userAgent);
        return ResponseEntity.ok(ApiResponse.of("Employee contract signed successfully. Contract is now FULLY_SIGNED.", response));
    }

    @PostMapping("/sign/{signingToken}/resend-otp")
    public ResponseEntity<ApiResponse<Void>> resendSigningOtp(@PathVariable String signingToken) {
        employeeContractService.resendSigningOtp(signingToken);
        return ResponseEntity.ok(ApiResponse.message("A new signing OTP has been sent."));
    }

    /**
     * GET /contracts/{id}/signing-history
     * Lấy nhật ký kiểm toán (Audit Log) lịch sử ký điện tử của 1 hợp đồng.
     */
    @GetMapping("/{id}/signing-history")
    public ResponseEntity<ApiResponse<List<SigningHistoryResponse>>> getSigningHistory(@PathVariable Long id) {
        List<SigningHistoryResponse> response = employeeContractService.getSigningHistory(id);
        return ResponseEntity.ok(ApiResponse.of("Contract signing history retrieved successfully", response));
    }

    /**
     * POST /contracts/{id}/resend-signing-link
     * Sinh lại token ký mới cho nhân viên khi link cũ hết hạn.
     */
    @PostMapping("/{id}/resend-signing-link")
    public ResponseEntity<ApiResponse<EmployeeContractResponse>> resendSigningLink(@PathVariable Long id) {
        EmployeeContractResponse response = employeeContractService.resendSigningLink(id);
        return ResponseEntity.ok(ApiResponse.of("New signing link generated and sent to employee email.", response));
    }

    /**
     * GET /contracts/dashboard-stats
     * Lấy các chỉ số thống kê tổng hợp hợp đồng cho Dashboard Admin/HR.
     */
    @GetMapping("/dashboard-stats")
    public ResponseEntity<ApiResponse<ContractDashboardStatsResponse>> getDashboardStats() {
        ContractDashboardStatsResponse response = employeeContractService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.of("Contract dashboard statistics retrieved successfully", response));
    }
}
