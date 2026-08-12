package com.ailms.controller;

import com.ailms.request.OneOnOneActionRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.OneOnOneRequestResponse;
import com.ailms.service.IOneOnOneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API HR chỉ kết nối liên hệ, giám sát và can thiệp hủy/hoàn tiền. */
@RestController
@RequestMapping("${api.prefix}/hr/one-on-one/requests")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_HR', 'ROLE_ADMIN')")
public class HrOneOnOneController {

    private final IOneOnOneService oneOnOneService;

    /** Lấy danh sách yêu cầu HR cần theo dõi. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<OneOnOneRequestResponse>>> getRequests() {
        return ResponseEntity.ok(ApiResponse.of(
                "HR one-on-one requests retrieved successfully", oneOnOneService.getHrRequests()));
    }

    /** Đánh dấu HR đã kết nối học viên với người dạy. */
    @PostMapping("/{requestId}/mark-contacted")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> markContacted(@PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one request marked as contacted", oneOnOneService.markContacted(requestId)));
    }

    /** Hủy yêu cầu khi HR cần can thiệp. */
    @PostMapping("/{requestId}/cancel")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> cancel(
            @PathVariable Long requestId,
            @RequestBody(required = false) OneOnOneActionRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one request cancelled",
                oneOnOneService.cancel(requestId, request != null ? request.getReason() : null)));
    }

    /** Hoàn tiền order gốc và đóng matching request. */
    @PostMapping("/{requestId}/refund")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> refund(
            @PathVariable Long requestId,
            @RequestBody OneOnOneActionRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one package refunded",
                oneOnOneService.refund(requestId, request.getReason())));
    }
}
