package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.LessonSearchRequest;
import com.ailms.response.LessonResponse;


import com.ailms.request.CreateLessonRequest;
import com.ailms.request.UpdateLessonRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.response.LessonResponse;

import java.util.List;

public interface ILessonService {
    Page<LessonResponse> search(LessonSearchRequest request);

    LessonResponse create(Long sectionId, CreateLessonRequest request);

    LessonResponse update(Long id, UpdateLessonRequest request);

    void delete(Long id);

    LessonResponse getById(Long id);

    List<LessonResponse> getLessonsBySectionId(Long sectionId);

    void reorder(ReorderRequest request);

}
