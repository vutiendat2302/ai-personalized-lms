package com.ailms.controller;

import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import org.springframework.data.domain.Page;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.response.AttendanceResponse;

import com.ailms.response.ApiResponse;
import com.ailms.service.IAttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final IAttendanceService attendanceService;

    @PostMapping
    public ResponseEntity<ApiResponse<AttendanceResponse>> create(@Valid @RequestBody CreateAttendanceRequest request) {
        AttendanceResponse response = attendanceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Attendance record created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAttendanceRequest request) {
        AttendanceResponse response = attendanceService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Attendance record updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> getById(@PathVariable Long id) {
        AttendanceResponse response = attendanceService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Attendance record retrieved successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<AttendanceResponse> response = attendanceService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Attendance records retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getAll() {
        List<AttendanceResponse> response = attendanceService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Attendance records retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        attendanceService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Attendance record deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<AttendanceResponse>>> search(AttendanceSearchRequest request) {
        Page<AttendanceResponse> result = attendanceService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Attendance successfully", result));
    }
}
