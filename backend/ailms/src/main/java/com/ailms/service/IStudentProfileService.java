package com.ailms.service;

import com.ailms.request.OnboardingRequest;
import com.ailms.request.StudentProfileRequest;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudentProfileResponse;

import java.util.List;

public interface IStudentProfileService {
    PageResponse<StudentProfileResponse> search(StudentProfileSearchRequest request);
    List<StudentProfileResponse> getAll();
    StudentProfileResponse getById(Long id);
    StudentProfileResponse create(StudentProfileRequest request);
    StudentProfileResponse update(Long id, StudentProfileRequest request);
    void delete(Long id);
    StudentProfileResponse completeOnboarding(OnboardingRequest request);
    StudentProfileResponse skipOnboarding(Long userId);
}
