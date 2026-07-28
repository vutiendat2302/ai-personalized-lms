package com.ailms.controller;

import com.ailms.request.AssignInterestsRequest;
import com.ailms.request.CreateGuardianRequest;
import com.ailms.request.CreateStudentProfileRequest;
import com.ailms.request.UpdateStudentProfileRequest;
import com.ailms.request.UpdateHasGoalRequest;
import com.ailms.request.UpdateIsMinorRequest;
import com.ailms.response.GuardianResponse;
import com.ailms.response.PageResponse;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.response.StudentProfileResponse;


import com.ailms.exception.ForbiddenException;
import com.ailms.response.ApiResponse;
import com.ailms.security.CustomUserDetails;
import com.ailms.service.IGuardianService;
import com.ailms.service.IStudentProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"${api.prefix}/student-profiles", "${api.prefix}/students"})
@RequiredArgsConstructor
public class StudentProfileController {

    private final IStudentProfileService studentProfileService;
    private final IGuardianService guardianService;

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStudentProfileRequest request) {
        StudentProfileResponse response = studentProfileService.update(id, request);
        return ResponseEntity.ok(ApiResponse.of("Student profile updated successfully", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudentProfileResponse>> create(@Valid @RequestBody CreateStudentProfileRequest request) {
        StudentProfileResponse response = studentProfileService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Student profile created successfully", response));
    }

    @PostMapping("/guardian")
    public ResponseEntity<ApiResponse<GuardianResponse>> create(@Valid @RequestBody CreateGuardianRequest request) {
        GuardianResponse response = guardianService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of("Guardian created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> getById(@PathVariable Long id) {
        StudentProfileResponse response = studentProfileService.getById(id);
        return ResponseEntity.ok(ApiResponse.of("Student profile retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentProfileResponse>>> getAll() {
        List<StudentProfileResponse> response = studentProfileService.getAll();
        return ResponseEntity.ok(ApiResponse.of("Student profiles retrieved successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        studentProfileService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Student profile deleted successfully"));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<StudentProfileResponse>>> search(StudentProfileSearchRequest request) {
        PageResponse<StudentProfileResponse> result = studentProfileService.search(request);
        return ResponseEntity.ok(ApiResponse.of("Search StudentProfile successfully", result));
    }

    @PostMapping("/interests")
    public ResponseEntity<ApiResponse<Void>> assignInterestsForCurrentUser(
            @Valid @RequestBody AssignInterestsRequest request) {
        Long userId = getCurrentUserId();
        studentProfileService.assignInterests(userId, request);
        return ResponseEntity.ok(ApiResponse.message("Interests assigned successfully"));
    }

    @PostMapping("/{userId}/interests")
    public ResponseEntity<ApiResponse<Void>> assignInterests(
            @PathVariable Long userId,
            @Valid @RequestBody AssignInterestsRequest request) {
        studentProfileService.assignInterests(userId, request);
        return ResponseEntity.ok(ApiResponse.message("Interests assigned successfully"));
    }

    @PatchMapping("/{id}/has-goal")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> updateHasGoal(
            @PathVariable Long id,
            @Valid @RequestBody UpdateHasGoalRequest request) {
        StudentProfileResponse response = studentProfileService.updateHasGoal(id, request);
        return ResponseEntity.ok(ApiResponse.of("Student profile hasGoal status updated successfully", response));
    }

    @PatchMapping("/{id}/is-minor")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> updateIsMinor(
            @PathVariable Long id,
            @Valid @RequestBody UpdateIsMinorRequest request) {
        StudentProfileResponse response = studentProfileService.updateIsMinor(id, request);
        return ResponseEntity.ok(ApiResponse.of("Student profile isMinor status updated successfully", response));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> countStudents() {
        long response = studentProfileService.countStudents();
        return ResponseEntity.ok(ApiResponse.of("Total students count retrieved successfully", response));
    }

    @GetMapping("/stats/overview")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getOverviewStats() {
        return ResponseEntity.ok(ApiResponse.of("Overview stats", studentProfileService.getStudentOverviewStats()));
    }

    @GetMapping("/stats/onboarding")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getOnboardingStats() {
        return ResponseEntity.ok(ApiResponse.of("Onboarding stats", studentProfileService.getStudentOnboardingStats()));
    }

    @GetMapping("/stats/goals")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getGoalTypeStats() {
        return ResponseEntity.ok(ApiResponse.of("Goal type stats", studentProfileService.getStudentGoalTypeStats()));
    }

    @GetMapping("/stats/leaderboard")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getStreakLeaderboard() {
        return ResponseEntity.ok(ApiResponse.of("Streak leaderboard", studentProfileService.getStudentStreakLeaderboard()));
    }

    @GetMapping("/stats/activity-trend")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getActivityTrend() {
        return ResponseEntity.ok(ApiResponse.of("Activity trend 30 days", studentProfileService.getStudentActivityTrend30Days()));
    }

    @GetMapping("/stats/inactive-warning")
    public ResponseEntity<ApiResponse<Long>> getInactiveWarningCount(@RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(ApiResponse.of("Inactive warning count", studentProfileService.getInactiveStudentCount(days)));
    }

    @GetMapping("/stats/interests")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getTopInterests() {
        return ResponseEntity.ok(ApiResponse.of("Top interests stats", studentProfileService.getTopStudentInterests()));
    }



    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                return userDetails.getUser().getId();
            }
        }
        throw new ForbiddenException("Yêu cầu đăng nhập để thực hiện thao tác này.");
    }
}
