package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.LessonResourceSearchRequest;



import com.ailms.request.CreateResourceRequest;
import com.ailms.request.UpdateResourceRequest;
import com.ailms.response.ResourceResponse;

import java.util.List;

public interface ILessonResourceService {
    Page<ResourceResponse> search(LessonResourceSearchRequest request);

    ResourceResponse create(Long lessonId, CreateResourceRequest request);

    ResourceResponse update(Long id, UpdateResourceRequest request);

    void delete(Long id);

    List<ResourceResponse> getResourcesByLessonId(Long lessonId);

}
