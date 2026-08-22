package com.ailms.controller;

import com.ailms.entity.enums.AttendanceStatusEnum;
import com.ailms.request.AttendanceSearchRequest;
import com.ailms.request.CreateAttendanceRequest;
import com.ailms.request.SimulateAttendanceRequest;
import com.ailms.request.UpdateAttendanceRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.AttendanceResponse;
import com.ailms.response.AttendanceSummaryResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IAttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("${api.prefix}/attendances")
@RequiredArgsConstructor
public class AttendanceController {

    private final IAttendanceService attendanceService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<AttendanceResponse>>> search(AttendanceSearchRequest request) {
        PageResponse<AttendanceResponse> result = attendanceService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Tìm kiếm danh sách chấm công thành công", result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AttendanceResponse>>> getList(AttendanceSearchRequest request) {
        PageResponse<AttendanceResponse> result = attendanceService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách chấm công thành công", result));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AttendanceSummaryResponse>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long departmentId) {
        AttendanceSummaryResponse summary = attendanceService.getSummary(fromDate, toDate, departmentId);
        return ResponseEntity.ok(ApiResponse.of("Lấy tổng quan chấm công thành công", summary));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> getById(@PathVariable Long id) {
        AttendanceResponse response = attendanceService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Lấy chi tiết bản ghi chấm công thành công", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<AttendanceResponse> response = attendanceService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Lấy danh sách chấm công nhân viên thành công", response));
    }

    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkIn(
            @RequestParam Long employeeId,
            @RequestParam(required = false) String note) {
        AttendanceResponse response = attendanceService.checkIn(employeeId, note);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Check-in thành công", response));
    }

    @PostMapping("/check-out")
    public ResponseEntity<ApiResponse<AttendanceResponse>> checkOut(
            @RequestParam Long employeeId,
            @RequestParam(required = false) String note) {
        AttendanceResponse response = attendanceService.checkOut(employeeId, note);
        return ResponseEntity.ok(ApiResponse.of("Check-out thành công", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AttendanceResponse>> create(@Valid @RequestBody CreateAttendanceRequest request) {
        AttendanceResponse response = attendanceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Tạo bản ghi chấm công thành công", response));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> patchUpdate(
            @PathVariable Long id,
            @RequestBody UpdateAttendanceRequest request) {
        AttendanceResponse response = attendanceService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Điều chỉnh thủ công bản ghi chấm công thành công", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> update(
            @PathVariable Long id,
            @RequestBody UpdateAttendanceRequest request) {
        AttendanceResponse response = attendanceService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Cập nhật bản ghi chấm công thành công", response));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<AttendanceResponse>> approve(@PathVariable Long id) {
        AttendanceResponse response = attendanceService.approve(id);
        return ResponseEntity.ok(ApiResponse.of("Phê duyệt bản ghi chấm công thành công", response));
    }

    @PostMapping("/bulk-approve")
    public ResponseEntity<ApiResponse<Void>> bulkApprove(@RequestBody List<Long> ids) {
        attendanceService.bulkApprove(ids);
        return ResponseEntity.ok(ApiResponse.message("Phê duyệt hàng loạt bản ghi chấm công thành công"));
    }

    @PostMapping("/admin/simulate")
    public ResponseEntity<ApiResponse<Integer>> simulateAdmin(@Valid @RequestBody SimulateAttendanceRequest request) {
        int count = attendanceService.simulate(request);
        return ResponseEntity.ok(ApiResponse.of("Sinh dữ liệu giả lập chấm công thành công", count));
    }

    @PostMapping("/simulate")
    public ResponseEntity<ApiResponse<Integer>> simulate(@Valid @RequestBody SimulateAttendanceRequest request) {
        int count = attendanceService.simulate(request);
        return ResponseEntity.ok(ApiResponse.of("Sinh dữ liệu giả lập chấm công thành công", count));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(AttendanceSearchRequest request) {
        byte[] csvBytes = attendanceService.exportCsv(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance_report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvBytes);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        attendanceService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Xóa bản ghi chấm công thành công"));
    }

    @PutMapping("/status/{id}")
    public ResponseEntity<ApiResponse<AttendanceResponse>> updateStatus(
            @PathVariable Long id, 
            @RequestParam AttendanceStatusEnum statusEnum) {
        AttendanceResponse response = attendanceService.updateStatus(id, statusEnum);
        return ResponseEntity.ok(ApiResponse.of("Cập nhật trạng thái chấm công thành công", response));
    }
}
