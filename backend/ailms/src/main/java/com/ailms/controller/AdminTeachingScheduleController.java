package com.ailms.controller;

import com.ailms.response.AdminTeachingScheduleResponse;
import com.ailms.response.ApiResponse;
import com.ailms.request.UpdateAdminTeachingScheduleRequest;
import com.ailms.service.imp.AdminTeachingScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("${api.prefix}/admin/teaching-schedules")
@RequiredArgsConstructor
public class AdminTeachingScheduleController {
    private final AdminTeachingScheduleService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminTeachingScheduleResponse>>> getSchedule(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 62) {
            throw new IllegalArgumentException("Khoảng lịch phải từ 0 đến 62 ngày.");
        }
        return ResponseEntity.ok(ApiResponse.of("Lấy lịch giảng dạy thành công",
                service.getSchedule(from.atStartOfDay(), to.plusDays(1).atStartOfDay())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminTeachingScheduleResponse>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Lấy chi tiết lịch dạy thành công", service.getDetail(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminTeachingScheduleResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateAdminTeachingScheduleRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Cập nhật lịch dạy thành công", service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Đã hủy lịch dạy và giữ lại lịch sử"));
    }
}
