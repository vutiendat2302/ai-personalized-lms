package com.ailms.service;

import com.ailms.request.CreateGuardianRequest;
import com.ailms.request.UpdateGuardianRequest;
import com.ailms.response.PageResponse;
import com.ailms.request.GuardianSearchRequest;
import com.ailms.response.GuardianResponse;


import java.util.List;

public interface IGuardianService {
    PageResponse<GuardianResponse> search(GuardianSearchRequest request);
    List<GuardianResponse> getAll();
    GuardianResponse getById(Long id);
    List<GuardianResponse> getByStudentUserId(Long studentUserId);
    GuardianResponse create(CreateGuardianRequest request);
    GuardianResponse update(Long id, UpdateGuardianRequest request);
    void delete(Long id);
}
