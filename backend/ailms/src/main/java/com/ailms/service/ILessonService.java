package com.ailms.service;

import com.ailms.request.CreateLessonRequest;
import com.ailms.request.LessonSearchRequest;
import com.ailms.request.ReorderRequest;
import com.ailms.request.UpdateLessonRequest;
import com.ailms.response.LessonPreviewResponse;
import com.ailms.response.LessonResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface ILessonService {
    PageResponse<LessonResponse> search(LessonSearchRequest request);

    LessonResponse create(Long sectionId, CreateLessonRequest request);

    LessonResponse update(Long id, UpdateLessonRequest request);

    void delete(Long id);

    LessonResponse getById(Long id);

    LessonPreviewResponse getLessonWithPreview(Long id, Long currentUserId);

    List<LessonResponse> getLessonsBySectionId(Long sectionId);

    void reorder(ReorderRequest request);
}
