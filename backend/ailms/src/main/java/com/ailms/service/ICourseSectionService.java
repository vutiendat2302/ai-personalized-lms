package com.ailms.service;

import com.ailms.request.CreateSectionRequest;
import com.ailms.request.UpdateSectionRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.SectionResponse;

import java.util.List;

public interface ICourseSectionService {

    SectionResponse create(Long courseId, CreateSectionRequest request);

    SectionResponse update(Long id, UpdateSectionRequest request);

    void delete(Long id);

    List<SectionResponse> getSectionsByCourseId(Long courseId);

    void reorder(ReorderRequest request);

}
