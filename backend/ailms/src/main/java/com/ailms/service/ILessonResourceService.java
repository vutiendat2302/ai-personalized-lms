package com.ailms.service;

import com.ailms.request.CreateResourceRequest;
import com.ailms.request.UpdateResourceRequest;
import com.ailms.response.ResourceResponse;

import java.util.List;

public interface ILessonResourceService {

    ResourceResponse create(Long lessonId, CreateResourceRequest request);

    ResourceResponse update(Long id, UpdateResourceRequest request);

    void delete(Long id);

    List<ResourceResponse> getResourcesByLessonId(Long lessonId);

}
