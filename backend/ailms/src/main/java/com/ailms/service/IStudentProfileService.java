package com.ailms.service;

import com.ailms.request.CreateStudentProfileRequest;
import com.ailms.request.OnboardingRequest;
import com.ailms.request.StudentProfileSearchRequest;
import com.ailms.request.UpdateStudentProfileRequest;
import com.ailms.response.PageResponse;
import com.ailms.response.StudentProfileResponse;

import java.util.List;

public interface IStudentProfileService {
    PageResponse<StudentProfileResponse> search(StudentProfileSearchRequest request);
    List<StudentProfileResponse> getAll();
    StudentProfileResponse getById(Long id);
    StudentProfileResponse create(CreateStudentProfileRequest request);
    StudentProfileResponse update(Long id, UpdateStudentProfileRequest request);
    void delete(Long id);


    /**
     * Hoàn thành quá trình onboarding của học viên.
     *
     * @param request Thông tin onboarding.
     * @return Hồ sơ học viên sau khi cập nhật.
     */
    StudentProfileResponse completeOnboarding(OnboardingRequest request);

    /**
     * Bỏ qua quá trình onboarding.
     *
     * @param userId ID người dùng.
     * @return Hồ sơ học viên sau khi cập nhật.
     */
    StudentProfileResponse skipOnboarding(Long userId);
}
