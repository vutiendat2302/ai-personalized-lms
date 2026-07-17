package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuizSearchRequest;
import com.ailms.response.QuizResponse;

import com.ailms.entity.QuizEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.QuizRepository;
import com.ailms.request.QuizRequest;
import com.ailms.response.QuizResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IQuizService {
    PageResponse<QuizResponse> search(QuizSearchRequest request);

    List<QuizResponse> getAll();

    QuizResponse getById(Long id);

    List<QuizResponse> getByLessonId(Long lessonId);

    List<QuizResponse> getByCourseId(Long courseId);

    List<QuizResponse> getBySectionId(Long sectionId);

    QuizResponse create(QuizRequest request);

    QuizResponse update(Long id, QuizRequest request);

    void delete(Long id);
}
