package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.CourseSectionSearchRequest;



import com.ailms.request.CreateSectionRequest;
import com.ailms.request.UpdateSectionRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.SectionResponse;

import java.util.List;

public interface ICourseSectionService {
    Page<SectionResponse> search(CourseSectionSearchRequest request);

    SectionResponse create(CreateSectionRequest request);

    SectionResponse update(Long id, UpdateSectionRequest request);

    void delete(Long id);

    List<SectionResponse> getSectionsByCourseId(Long courseId);

    void reorder(ReorderRequest request);

    // get section by id
    // get all section
    // search
    // Quan he ve lesson, source

    SectionResponse getById(Long id);
    List<SectionResponse> getAll();


}
