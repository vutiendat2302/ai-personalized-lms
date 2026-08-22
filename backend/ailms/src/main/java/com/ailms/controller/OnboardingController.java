package com.ailms.controller;

import com.ailms.request.OnboardingRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.StudentProfileResponse;
import com.ailms.service.IStudentProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final IStudentProfileService studentProfileService;

    @PostMapping("/complete")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> completeOnboarding(@Valid @RequestBody OnboardingRequest request) {
        StudentProfileResponse response = studentProfileService.completeOnboarding(request);
        return ResponseEntity.ok(ApiResponse.of("Onboarding completed successfully", response));
    }

    @PostMapping("/skip-goal")
    public ResponseEntity<ApiResponse<StudentProfileResponse>> skipGoal(@RequestParam Long userId) {
        StudentProfileResponse response = studentProfileService.skipOnboarding(userId);
        return ResponseEntity.ok(ApiResponse.of("Onboarding goal skipped", response));
    }
}
