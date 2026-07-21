package com.ailms.controller;

import com.ailms.request.AttendanceSearchRequest;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.AttendanceResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IAttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final IAttendanceService attendanceService;

    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkIn(
            @RequestParam Long employeeId,
            @RequestParam(required = false) String note) {
        AttendanceResponse response = attendanceService.checkIn(employeeId, note);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Check-in successful", response));
    }

    @PostMapping("/check-out")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkOut(
            @RequestParam Long employeeId,
            @RequestParam(required = false) String note) {
        AttendanceResponse response = attendanceService.checkOut(employeeId, note);
        return ResponseEntity.ok(ApiResponse.of("Check-out successful", response));
    }

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
    public ResponseEntity<ApiResponse<PageResponse<AttendanceResponse>>> search(AttendanceSearchRequest request) {
        PageResponse<AttendanceResponse> result = attendanceService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Attendance successfully", result));
    }
}
