package com.ailms.controller;

import com.ailms.request.CreateLeaveRequest;
import com.ailms.request.LeaveRequestSearchRequest;
import com.ailms.request.UpdateLeaveRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.LeaveRequestResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.ILeaveRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/leave-requests")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
public class LeaveRequestController {

    private final ILeaveRequestService leaveRequestService;

    /** HR/Admin tạo đơn nghỉ trong luồng quản trị nhân sự. */
    @PostMapping
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> create(@Valid @RequestBody CreateLeaveRequest request) {
        LeaveRequestResponse response = leaveRequestService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Leave request created successfully", response));
    }

    /** HR/Admin cập nhật nội dung đơn nghỉ. */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLeaveRequest request) {
        LeaveRequestResponse response = leaveRequestService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Leave request updated successfully", response));
    }

    /** HR/Admin phê duyệt hoặc từ chối đơn nghỉ bằng query contract thống nhất. */
    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> approve(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String rejectionReason) {
        LeaveRequestResponse response = leaveRequestService.approve(id, approve, rejectionReason);
        return ResponseEntity.ok(ApiResponse.of("Leave request status updated successfully", response));
    }

    /** HR/Admin hủy đơn nghỉ từ màn hình quản trị. */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long id) {
        leaveRequestService.cancel(id);
        return ResponseEntity.ok(ApiResponse.message("Leave request cancellation requested"));
    }

    /** Lấy chi tiết đơn nghỉ cho quản trị nhân sự. */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> getById(@PathVariable Long id) {
        LeaveRequestResponse response = leaveRequestService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Leave request retrieved successfully", response));
    }

    /** Lấy các đơn nghỉ của một nhân viên. */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<LeaveRequestResponse> response = leaveRequestService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Leave requests retrieved successfully", response));
    }

    /** Lấy toàn bộ đơn nghỉ trong phạm vi HR/Admin. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getAll() {
        List<LeaveRequestResponse> response = leaveRequestService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Leave requests retrieved successfully", response));
    }

    /** Tìm kiếm đơn nghỉ có phân trang và bộ lọc. */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<LeaveRequestResponse>>> search(LeaveRequestSearchRequest request) {
        PageResponse<LeaveRequestResponse> result = leaveRequestService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search LeaveRequest successfully", result));
    }
}
