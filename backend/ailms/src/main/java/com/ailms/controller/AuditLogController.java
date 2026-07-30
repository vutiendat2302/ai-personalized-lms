package com.ailms.controller;

import com.ailms.service.IAuditLogService;
import com.ailms.response.PageResponse;
import com.ailms.request.AuditLogSearchRequest;
import com.ailms.response.AuditLogResponse;

import com.ailms.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/audit-log")
@RequiredArgsConstructor
public class AuditLogController {

    private final IAuditLogService auditLogService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AuditLogResponse>> getByLogId(@PathVariable Long id) {
        AuditLogResponse response = auditLogService.getByLogId(id);
        return ResponseEntity.ok(ApiResponse.of("Audit log retrieved successfully", response));
    }

    /**
     * Tìm kiếm/lọc audit log có phân trang.
     */
    @GetMapping({"", "/page"})
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getAuditLogs(AuditLogSearchRequest request) {
        PageResponse<AuditLogResponse> response = auditLogService.getAuditLogs(request);
        return ResponseEntity.ok(ApiResponse.of("Audit logs retrieved successfully", response));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getAllAuditLogs() {
        List<AuditLogResponse> response = auditLogService.getAllAuditLogs();
        return ResponseEntity.ok(ApiResponse.of("All audit logs retrieved successfully", response));
    }

    /**
     * Lấy audit log của user (người thực hiện) có phân trang, tìm kiếm và filter.
     * VD: GET /api/audit-log/users/5/page?keyword=login&action=update_user&occurredFrom=2026-01-01T00:00:00&page=0&size=10&sortBy=occurredAt&sortDirection=DESC
     */
    @GetMapping("/users/{userId}/page")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getAuditLogsByUserId(
            @PathVariable Long userId,
            AuditLogSearchRequest request) {
        PageResponse<AuditLogResponse> response = auditLogService.getAuditLogsByUserId(userId, request);
        return ResponseEntity.ok(ApiResponse.of("User audit logs retrieved successfully", response));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getAuditLogsByEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            AuditLogSearchRequest request) {
        PageResponse<AuditLogResponse> response = auditLogService.getAuditLogsByEntity(entityType, entityId, request);
        return ResponseEntity.ok(ApiResponse.of("Entity audit logs retrieved successfully", response));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAuditLogs(AuditLogSearchRequest request) {
        byte[] csvBytes = auditLogService.exportAuditLogs(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=audit_logs_export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }
}
