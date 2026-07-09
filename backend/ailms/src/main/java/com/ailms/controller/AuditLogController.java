package com.ailms.controller;

import com.ailms.response.ApiResponse;
import com.ailms.response.AuditLogResponse;
import com.ailms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("api/audit-log")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;


    /**
     * Xem chi tiết 1 audit log theo id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AuditLogResponse>> getByLogId(@PathVariable Long id) {
        AuditLogResponse response = auditLogService.getByLogId(id);
        return ResponseEntity.ok(ApiResponse.of("Audit log retrieved successfully", response));
    }

    /**
     * Tìm kiếm/lọc audit log có phân trang, theo entityType, entityId, action, khoảng thời gian.
     * VD: GET /api/audit-logs?entityType=user&entityId=5&action=update_user&start=...&end=...
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long entityId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            Pageable pageable) {
        Page<AuditLogResponse> response = auditLogService.getAuditLogs(entityType, entityId, action, start, end, pageable);
        return ResponseEntity.ok(ApiResponse.of("Audit logs retrieved successfully", response));
    }

    /**
     * Lấy toàn bộ audit log, không phân trang.
     */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getAllAuditLogs() {
        List<AuditLogResponse> response = auditLogService.getAllAuditLogs();
        return ResponseEntity.ok(ApiResponse.of("All audit logs retrieved successfully", response));
    }

    /**
     * Lấy lịch sử hoạt động liên quan đến 1 user cụ thể (đã thực hiện hoặc bị tác động).
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getAuditLogsByUserId(@PathVariable Long userId) {
        List<AuditLogResponse> response = auditLogService.getAuditLogsByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("User audit logs retrieved successfully", response));
    }

}
