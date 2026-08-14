package com.ailms.controller;

import com.ailms.request.CreateClassRequest;
import com.ailms.request.UpdateClassRequest;
import com.ailms.request.UpdateClassScheduleSlotRequest;
import com.ailms.request.CancelClassSessionRequest;
import com.ailms.request.ScheduleClassSessionRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.ClassSearchRequest;
import com.ailms.response.ClassResponse;
import com.ailms.response.ClassScheduleResponse;
import com.ailms.response.ClassOnlineResponse;
import com.ailms.response.ClassSessionUsageResponse;


import com.ailms.response.ApiResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IClassService;
import com.ailms.service.IAssignmentService;
import com.ailms.service.IQuizService;
import com.ailms.service.IClassSessionManagementService;
import com.ailms.request.AssignmentRequest;
import com.ailms.request.QuizRequest;
import com.ailms.response.AssignmentResponse;
import com.ailms.response.QuizResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/classes")
@RequiredArgsConstructor
public class ClassController {

    private final IClassService classService;
    private final IAssignmentService assignmentService;
    private final IQuizService quizService;
    private final IClassSessionManagementService classSessionManagementService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<ClassResponse>> create(@Valid @RequestBody CreateClassRequest request) {
        ClassResponse response = classService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Class created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@classAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<ClassResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClassRequest request) {
        ClassResponse response = classService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Class updated successfully", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@classAccess.canView(#id, authentication)")
    public ResponseEntity<ApiResponse<ClassResponse>> getById(@PathVariable Long id) {
        ClassResponse response = classService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Class retrieved successfully", response));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getAll() {
        List<ClassResponse> response = classService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Classes retrieved successfully", response));
    }

    @GetMapping("/teaching/me")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER', 'ROLE_TA', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getMyTeachingClasses(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        Long userId = currentUser.getUser().getId();
        List<ClassResponse> response = classService.getTeachingClassesByUserId(userId);
        return ResponseEntity.ok(ApiResponse.of("Teaching classes retrieved successfully", response));
    }

    /** Lấy danh sách lớp của chính học viên từ membership trong JWT. */
    @GetMapping("/enrolled/me")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getMyEnrolledClasses(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<ClassResponse> response = classService.getStudentClassesByUserId(currentUser.getUser().getId());
        return ResponseEntity.ok(ApiResponse.of("Enrolled classes retrieved successfully", response));
    }

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getByCourseId(@PathVariable Long courseId) {
        List<ClassResponse> response = classService.getByCourseId(courseId);
        return ResponseEntity.ok(ApiResponse.of("Classes retrieved successfully", response));
    }

    @GetMapping("/{id}/schedules")
    @PreAuthorize("@classAccess.canView(#id, authentication)")
    public ResponseEntity<ApiResponse<List<ClassScheduleResponse>>> getSchedules(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Class schedules retrieved successfully", classService.getSchedules(id)));
    }

    @PutMapping("/{id}/schedules")
    @PreAuthorize("@classAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<List<ClassScheduleResponse>>> updateSchedules(
            @PathVariable Long id,
            @RequestBody List<UpdateClassScheduleSlotRequest> schedules) {
        return ResponseEntity.ok(ApiResponse.of("Class schedules updated successfully", classService.updateSchedules(id, schedules)));
    }

    /** Lấy số buổi đã nhận xét, còn lại và đã đặt theo quota gói. */
    @GetMapping("/{id}/session-usage")
    @PreAuthorize("@classAccess.canView(#id, authentication)")
    public ResponseEntity<ApiResponse<ClassSessionUsageResponse>> getSessionUsage(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Class session usage retrieved successfully",
                classSessionManagementService.getUsage(id)));
    }

    /** Giáo viên/TA đặt lịch mới bằng user trong JWT và thông báo cả lớp. */
    @PostMapping("/{id}/sessions")
    @PreAuthorize("@classAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> scheduleSession(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody ScheduleClassSessionRequest request) {
        ClassOnlineResponse response = classSessionManagementService.schedule(
                id, currentUser.getUser().getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Class session scheduled successfully", response));
    }

    /** Hủy buổi học với lý do bắt buộc và điều kiện báo trước một tiếng. */
    @PostMapping("/{id}/sessions/{sessionId}/cancel")
    @PreAuthorize("@classAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<ClassOnlineResponse>> cancelSession(
            @PathVariable Long id,
            @PathVariable Long sessionId,
            @AuthenticationPrincipal CustomUserDetails currentUser,
            @Valid @RequestBody CancelClassSessionRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Class session cancelled successfully",
                classSessionManagementService.cancel(
                        id, sessionId, currentUser.getUser().getId(), request)));
    }

    /** Giáo viên/trợ giảng giao bài tập có hạn cho đúng lớp mình quản lý. */
    @PostMapping("/{id}/assignments")
    @PreAuthorize("@classAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<AssignmentResponse>> createClassAssignment(
            @PathVariable Long id, @Valid @RequestBody AssignmentRequest request) {
        request.setClassId(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(
                "Class assignment created successfully", assignmentService.create(request)));
    }

    /** Thành viên lớp xem danh sách bài tập được giao cho lớp. */
    @GetMapping("/{id}/assignments")
    @PreAuthorize("@classAccess.canView(#id, authentication)")
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> getClassAssignments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                "Class assignments retrieved successfully", assignmentService.getByClassId(id)));
    }

    /** Giáo viên/trợ giảng giao quiz hoặc lịch thi có hạn cho đúng lớp. */
    @PostMapping("/{id}/quizzes")
    @PreAuthorize("@classAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<QuizResponse>> createClassQuiz(
            @PathVariable Long id, @Valid @RequestBody QuizRequest request) {
        request.setClassId(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(
                "Class quiz created successfully", quizService.create(request)));
    }

    /** Thành viên lớp xem quiz và lịch thi được giao cho lớp. */
    @GetMapping("/{id}/quizzes")
    @PreAuthorize("@classAccess.canView(#id, authentication)")
    public ResponseEntity<ApiResponse<List<QuizResponse>>> getClassQuizzes(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of(
                "Class quizzes retrieved successfully", quizService.getByClassId(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@classAccess.canManage(#id, authentication)")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        classService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Class deleted successfully"));
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_HR', 'ROLE_TEACHER', 'ROLE_TA')")
    public ResponseEntity<ApiResponse<PageResponse<ClassResponse>>> search(ClassSearchRequest request) {
        PageResponse<ClassResponse> result = classService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search Class successfully", result));
    }
}
