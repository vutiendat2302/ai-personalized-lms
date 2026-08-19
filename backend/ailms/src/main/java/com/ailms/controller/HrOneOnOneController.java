package com.ailms.controller;

import com.ailms.request.OneOnOneActionRequest;
import com.ailms.request.OneOnOneConnectionRejectRequest;
import com.ailms.request.OneOnOneNotifyInstructorsRequest;
import com.ailms.request.OneOnOneTrialClassRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.OneOnOneInstructorCandidateResponse;
import com.ailms.response.OneOnOneRequestResponse;
import com.ailms.service.IOneOnOneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

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

    /** Xác nhận kết nối và tạo luôn lớp cùng buổi học thử. */
    @PostMapping("/{requestId}/mark-contacted")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> markContacted(
            @PathVariable Long requestId,
            @Valid @RequestBody OneOnOneTrialClassRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one connection and trial scheduled",
                oneOnOneService.markContacted(requestId, request)));
    }

    /** HR đổi lịch học thử và vẫn giữ nguyên giáo viên đã kết nối. */
    @PutMapping("/{requestId}/trial-class")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> rescheduleTrialClass(
            @PathVariable Long requestId,
            @Valid @RequestBody OneOnOneTrialClassRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one trial rescheduled", oneOnOneService.rescheduleTrialClass(requestId, request)));
    }

    /** Từ chối kết nối hiện tại và mở lại yêu cầu cho người dạy khác. */
    @PostMapping("/{requestId}/reject-connection")
    public ResponseEntity<ApiResponse<OneOnOneRequestResponse>> rejectConnection(
            @PathVariable Long requestId,
            @Valid @RequestBody OneOnOneConnectionRejectRequest request) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one connection rejected",
                oneOnOneService.rejectConnection(requestId, request.getReason())));
    }

    /** Lấy danh sách Teacher/TA đúng danh mục mà HR có thể lựa chọn. */
    @GetMapping("/{requestId}/instructor-candidates")
    public ResponseEntity<ApiResponse<List<OneOnOneInstructorCandidateResponse>>> getInstructorCandidates(
            @PathVariable Long requestId) {
        return ResponseEntity.ok(ApiResponse.of(
                "One-on-one instructor candidates retrieved",
                oneOnOneService.getInstructorCandidates(requestId)));
    }

    /** Gửi yêu cầu 1-1 tới các Teacher/TA do HR lựa chọn. */
    @PostMapping("/{requestId}/notify-instructors")
    public ResponseEntity<ApiResponse<Void>> notifyInstructors(
            @PathVariable Long requestId,
            @Valid @RequestBody OneOnOneNotifyInstructorsRequest request) {
        oneOnOneService.notifyInstructors(requestId, request.getInstructorIds());
        return ResponseEntity.ok(ApiResponse.message("Selected instructors notified"));
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
