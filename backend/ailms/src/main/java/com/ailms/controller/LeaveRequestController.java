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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/leave-requests")
@RequiredArgsConstructor
public class LeaveRequestController {

    private final ILeaveRequestService leaveRequestService;

    @PostMapping
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> create(@Valid @RequestBody CreateLeaveRequest request) {
        LeaveRequestResponse response = leaveRequestService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Leave request created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLeaveRequest request) {
        LeaveRequestResponse response = leaveRequestService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Leave request updated successfully", response));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> approve(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String rejectionReason) {
        LeaveRequestResponse response = leaveRequestService.approve(id, approve, rejectionReason);
        return ResponseEntity.ok(ApiResponse.of("Leave request status updated successfully", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable Long id) {
        leaveRequestService.cancel(id);
        return ResponseEntity.ok(ApiResponse.message("Leave request cancellation requested"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LeaveRequestResponse>> getById(@PathVariable Long id) {
        LeaveRequestResponse response = leaveRequestService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Leave request retrieved successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<LeaveRequestResponse> response = leaveRequestService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Leave requests retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LeaveRequestResponse>>> getAll() {
        List<LeaveRequestResponse> response = leaveRequestService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Leave requests retrieved successfully", response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<LeaveRequestResponse>>> search(LeaveRequestSearchRequest request) {
        PageResponse<LeaveRequestResponse> result = leaveRequestService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search LeaveRequest successfully", result));
    }
}
