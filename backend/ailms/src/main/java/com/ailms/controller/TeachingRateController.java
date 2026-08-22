package com.ailms.controller;

import com.ailms.request.CreateTeachingRateRequest;
import com.ailms.request.UpdateTeachingRateRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.TeachingRateSearchRequest;
import com.ailms.response.TeachingRateResponse;


import com.ailms.response.ApiResponse;
import com.ailms.service.ITeachingRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.ailms.repository.ClassRepository;
import com.ailms.exception.BusinessException;

@RestController
@RequestMapping("${api.prefix}/teaching-rates")
@RequiredArgsConstructor
public class TeachingRateController {

    private final ITeachingRateService teachingRateService;
    private final ClassRepository classRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<TeachingRateResponse>> create(@Valid @RequestBody CreateTeachingRateRequest request) {
        TeachingRateResponse response = teachingRateService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teaching rate created successfully", response));
    }

    /** Tương thích form HR cũ: đổi tên lớp thành classId rồi tạo rate hiệu lực ngay. */
    @PostMapping("/update")
    public ResponseEntity<ApiResponse<TeachingRateResponse>> updateFromEmployeeForm(@RequestBody Map<String, Object> body) {
        Object employee = body.get("teacherId");
        Object className = body.get("className");
        Object rate = body.get("rate");
        if (employee == null || className == null || rate == null) throw new BusinessException("Thiếu giáo viên, lớp hoặc đơn giá.");
        Long classId = classRepository.findFirstByNameIgnoreCase(String.valueOf(className).trim())
                .orElseThrow(() -> new BusinessException("Không tìm thấy lớp có tên: " + className)).getId();
        CreateTeachingRateRequest request = CreateTeachingRateRequest.builder()
                .employeeId(Long.valueOf(String.valueOf(employee))).classId(classId)
                .rate(new BigDecimal(String.valueOf(rate))).effectiveFrom(LocalDateTime.now()).build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teaching rate created successfully", teachingRateService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TeachingRateResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTeachingRateRequest request) {
        TeachingRateResponse response = teachingRateService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Teaching rate updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TeachingRateResponse>> getById(@PathVariable Long id) {
        TeachingRateResponse response = teachingRateService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Teaching rate retrieved successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<TeachingRateResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<TeachingRateResponse> response = teachingRateService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Teaching rates retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeachingRateResponse>>> getAll() {
        List<TeachingRateResponse> response = teachingRateService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Teaching rates retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        teachingRateService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Teaching rate deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<TeachingRateResponse>>> search(TeachingRateSearchRequest request) {
        PageResponse<TeachingRateResponse> result = teachingRateService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search TeachingRate successfully", result));
    }
}
