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
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR')")
public class ClassManagementController {

    private final IClassManagementService classManagementService;

    /** HR/Admin tạo lớp nhóm và phân công ban đầu. */
    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<ClassResponse>> createGroupClass(@Valid @RequestBody CreateGroupClassRequest request) {
        ClassResponse response = classManagementService.createGroupClass(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Group class created successfully", response));
    }

    /** HR/Admin tạo package qua luồng quản lý lớp. */
    @PostMapping("/course-packages")
    public ResponseEntity<ApiResponse<CoursePackageResponse>> createCoursePackage(@Valid @RequestBody CreateCoursePackageRequest request) {
        CoursePackageResponse response = classManagementService.createCoursePackage(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Course package created successfully", response));
    }

    /** HR/Admin tạo yêu cầu chuyển lớp thay người dùng trong trường hợp hỗ trợ. */
    @PostMapping("/classes/transfer-request")
    public ResponseEntity<ApiResponse<Void>> requestClassTransfer(
            @RequestParam Long userId,
            @Valid @RequestBody ClassTransferRequest request) {
        classManagementService.requestClassTransfer(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Class transfer request submitted"));
    }

    /** HR/Admin quyết định yêu cầu chuyển lớp. */
    @PostMapping("/classes/transfer-request/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveClassTransfer(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String rejectionReason,
            @RequestParam Long adminUserId) {
        classManagementService.approveClassTransfer(id, approve, rejectionReason, adminUserId);
        return ResponseEntity.ok(ApiResponse.message("Class transfer request processed successfully"));
    }

    /** HR/Admin tạo yêu cầu đổi giáo viên cho enrollment. */
    @PostMapping("/classes/teacher-change-request")
    public ResponseEntity<ApiResponse<Void>> requestTeacherChange(
            @RequestParam Long userId,
            @Valid @RequestBody TeacherChangeRequest request) {
        classManagementService.requestTeacherChange(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Teacher change request submitted"));
    }

    /** HR/Admin quyết định yêu cầu đổi giáo viên. */
    @PostMapping("/classes/teacher-change-request/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveTeacherChange(
            @PathVariable Long id,
            @RequestParam boolean approve,
            @RequestParam(required = false) String rejectionReason,
            @RequestParam Long adminUserId) {
        classManagementService.approveTeacherChange(id, approve, rejectionReason, adminUserId);
        return ResponseEntity.ok(ApiResponse.message("Teacher change request processed successfully"));
    }

    /** HR/Admin điều chỉnh lịch một buổi học online. */
    @PostMapping("/classes/{id}/reschedule")
    public ResponseEntity<ApiResponse<Void>> rescheduleOnlineClass(
            @PathVariable Long id,
            @RequestParam LocalDateTime newScheduledAt,
            @RequestParam(required = false) Integer durationMin,
            @RequestParam Long teacherUserId) {
        classManagementService.rescheduleOnlineClass(id, newScheduledAt, durationMin, teacherUserId);
        return ResponseEntity.ok(ApiResponse.message("Online class session rescheduled successfully"));
    }

    /** HR/Admin cập nhật khung sẵn sàng của người dạy. */
    @PostMapping("/teacher-availabilities")
    public ResponseEntity<ApiResponse<Void>> addTeacherAvailability(@Valid @RequestBody TeacherAvailabilityRequest request) {
        classManagementService.addTeacherAvailability(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.message("Teacher availability slot added successfully"));
    }
}
