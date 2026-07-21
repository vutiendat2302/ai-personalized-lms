package com.ailms.service;

import com.ailms.request.TeacherAvailabilityRequest;
import com.ailms.request.UpdateTeacherAvailabilityRequest;
import com.ailms.response.TeacherAvailabilityResponse;

import java.util.List;

public interface ITeacherAvailabilityService {

    TeacherAvailabilityResponse addTeacherAvailability(TeacherAvailabilityRequest request);

    TeacherAvailabilityResponse getTeacherAvailabilityById(Long id);

    List<TeacherAvailabilityResponse> getTeacherAvailabilitiesByEmployeeId(Long employeeId);

    TeacherAvailabilityResponse updateTeacherAvailability(Long id, UpdateTeacherAvailabilityRequest request);

    void deleteTeacherAvailability(Long id);
}
