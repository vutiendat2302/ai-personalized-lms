package com.ailms.controller;

import com.ailms.request.CreateTeachingSessionPaymentRequest;
import com.ailms.request.TeachingSessionPaymentSearchRequest;
import com.ailms.request.UpdateTeachingSessionPaymentRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PageResponse;
import com.ailms.response.TeachingSessionPaymentResponse;
import com.ailms.service.ITeachingSessionPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/teaching-session-payments")
@RequiredArgsConstructor
public class TeachingSessionPaymentController {

    private final ITeachingSessionPaymentService teachingSessionPaymentService;

    @PostMapping
    public ResponseEntity<ApiResponse<TeachingSessionPaymentResponse>> create(@Valid @RequestBody CreateTeachingSessionPaymentRequest request) {
        TeachingSessionPaymentResponse response = teachingSessionPaymentService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teaching session payment created successfully", response));
    }

    @PostMapping("/{id}/ta-evaluation")
    public ResponseEntity<ApiResponse<TeachingSessionPaymentResponse>> submitTaEvaluation(
            @PathVariable Long id,
            @RequestParam String note) {
        TeachingSessionPaymentResponse response = teachingSessionPaymentService.submitTaEvaluation(id, note);
        return ResponseEntity.ok(ApiResponse.of("TA evaluation submitted successfully", response));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<TeachingSessionPaymentResponse>> confirmPayment(@PathVariable Long id) {
        TeachingSessionPaymentResponse response = teachingSessionPaymentService.confirmPayment(id);
        return ResponseEntity.ok(ApiResponse.of("Teaching session payment confirmed successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TeachingSessionPaymentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTeachingSessionPaymentRequest request) {
        TeachingSessionPaymentResponse response = teachingSessionPaymentService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Teaching session payment updated successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TeachingSessionPaymentResponse>> getById(@PathVariable Long id) {
        TeachingSessionPaymentResponse response = teachingSessionPaymentService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Teaching session payment retrieved successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<TeachingSessionPaymentResponse>>> getByEmployeeId(@PathVariable Long employeeId) {
        List<TeachingSessionPaymentResponse> response = teachingSessionPaymentService.getByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Teaching session payments retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeachingSessionPaymentResponse>>> getAll() {
        List<TeachingSessionPaymentResponse> response = teachingSessionPaymentService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Teaching session payments retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        teachingSessionPaymentService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Teaching session payment deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<TeachingSessionPaymentResponse>>> search(TeachingSessionPaymentSearchRequest request) {
        PageResponse<TeachingSessionPaymentResponse> result = teachingSessionPaymentService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search TeachingSessionPayment successfully", result));
    }
}
