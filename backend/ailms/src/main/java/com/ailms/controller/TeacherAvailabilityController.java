package com.ailms.controller;

import com.ailms.request.TeacherAvailabilityRequest;
import com.ailms.request.UpdateTeacherAvailabilityRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.TeacherAvailabilityResponse;
import com.ailms.service.ITeacherAvailabilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/teacher-availabilities")
@RequiredArgsConstructor
public class TeacherAvailabilityController {

    private final ITeacherAvailabilityService teacherAvailabilityService;

    @PostMapping
    public ResponseEntity<ApiResponse<TeacherAvailabilityResponse>> addTeacherAvailability(@Valid @RequestBody TeacherAvailabilityRequest request) {
        TeacherAvailabilityResponse response = teacherAvailabilityService.addTeacherAvailability(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Teacher availability slot added successfully", response));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<ApiResponse<List<TeacherAvailabilityResponse>>> getTeacherAvailabilitiesByEmployeeId(@PathVariable Long employeeId) {
        List<TeacherAvailabilityResponse> response = teacherAvailabilityService.getTeacherAvailabilitiesByEmployeeId(employeeId);
        return ResponseEntity.ok(ApiResponse.of("Retrieved teacher availabilities successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TeacherAvailabilityResponse>> getTeacherAvailabilityById(@PathVariable Long id) {
        TeacherAvailabilityResponse response = teacherAvailabilityService.getTeacherAvailabilityById(id);
        return ResponseEntity.ok(ApiResponse.of("Retrieved teacher availability successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TeacherAvailabilityResponse>> updateTeacherAvailability(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTeacherAvailabilityRequest request) {
        TeacherAvailabilityResponse response = teacherAvailabilityService.updateTeacherAvailability(id, request);
        return ResponseEntity.ok(ApiResponse.of("Teacher availability slot updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTeacherAvailability(@PathVariable Long id) {
        teacherAvailabilityService.deleteTeacherAvailability(id);
        return ResponseEntity.ok(ApiResponse.message("Teacher availability slot deleted successfully"));
    }
}
