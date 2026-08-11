package com.ailms.controller;

import com.ailms.request.*;
import com.ailms.response.ApiResponse;
import com.ailms.response.ClassResponse;
import com.ailms.response.CoursePackageResponse;
import com.ailms.service.IClassManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("${api.prefix}/class_managements")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
public class ClassManagementController {

    private final IClassManagementService classManagementService;

    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<ClassResponse>> createGroupClass(@Valid @RequestBody CreateGroupClassRequest request) {
        ClassResponse response = classManagementService.createGroupClass(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Group class created successfully", response));
    }

    @PostMapping("/course-packages")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> createCoursePackage(@Valid @RequestBody CreateCoursePackageRequest request) {
        CoursePackageResponse response = classManagementService.createCoursePackage(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course package created successfully", response));
    }

    @PostMapping("/classes/transfer-request")
    public ResponseEntity<ApiResponse<Void>> requestClassTransfer(
            @RequestParam Long userId,
            @Valid @RequestBody ClassTransferRequest request) {
        classManagementService.requestClassTransfer(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Class transfer request submitted"));
    }

    @PostMapping("/classes/transfer-request/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveClassTransfer(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String rejectionReason,
            @RequestParam Long adminUserId) {
        classManagementService.approveClassTransfer(id, approve, rejectionReason, adminUserId);
        return ResponseEntity.ok(ApiResponse.message("Class transfer request processed successfully"));
    }

    @PostMapping("/classes/teacher-change-request")
    public ResponseEntity<ApiResponse<Void>> requestTeacherChange(
            @RequestParam Long userId,
            @Valid @RequestBody TeacherChangeRequest request) {
        classManagementService.requestTeacherChange(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Teacher change request submitted"));
    }

    @PostMapping("/classes/teacher-change-request/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveTeacherChange(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String rejectionReason,
            @RequestParam Long adminUserId) {
        classManagementService.approveTeacherChange(id, approve, rejectionReason, adminUserId);
        return ResponseEntity.ok(ApiResponse.message("Teacher change request processed successfully"));
    }

    @PostMapping("/classes/{id}/reschedule")
    public ResponseEntity<ApiResponse<Void>> rescheduleOnlineClass(
            @PathVariable Long id,
            @RequestParam LocalDateTime newScheduledAt,
            @RequestParam(required = false) Integer durationMin,
            @RequestParam Long teacherUserId) {
        classManagementService.rescheduleOnlineClass(id, newScheduledAt, durationMin, teacherUserId);
        return ResponseEntity.ok(ApiResponse.message("Online class session rescheduled successfully"));
    }

    @PostMapping("/teacher-availabilities")
    public ResponseEntity<ApiResponse<Void>> addTeacherAvailability(@Valid @RequestBody TeacherAvailabilityRequest request) {
        classManagementService.addTeacherAvailability(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Teacher availability slot added successfully"));
    }
}
