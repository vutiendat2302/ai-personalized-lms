package com.ailms.service;

import com.ailms.request.CreateClassResourceRequest;
import com.ailms.response.ClassResourceResponse;
import com.ailms.response.PageResponse;

public interface IClassResourceService {
    ClassResourceResponse createResource(Long classId, CreateClassResourceRequest request);
    PageResponse<ClassResourceResponse> getResourcesPage(Long classId, String keyword, int page, int size);
    void deleteResource(Long resourceId);
}
