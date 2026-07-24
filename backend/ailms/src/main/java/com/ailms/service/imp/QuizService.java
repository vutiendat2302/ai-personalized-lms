package com.ailms.service.imp;

import com.ailms.repository.specification.QuizSpecification;
import com.ailms.request.QuizSearchRequest;
import com.ailms.service.IQuizService;

import com.ailms.entity.QuizEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizMapper;
import com.ailms.repository.QuizRepository;
import com.ailms.request.QuizRequest;
import com.ailms.response.QuizResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import com.ailms.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuizService implements IQuizService {
    @Override
    public PageResponse<QuizResponse> search(QuizSearchRequest request) {
        log.info("Searching Quiz via specification");
        Specification<QuizEntity> spec = QuizSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<QuizEntity> page = quizRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(quizMapper::toResponse));
    }

    private final QuizRepository quizRepository;
    private final QuizMapper quizMapper;

    private static final String RESOURCE_NAME = "Quiz";

    public List<QuizResponse> getAll() {
        log.info("Getting all quizzes");
        return quizMapper.toResponseList(quizRepository.findAll());
    }

    public QuizResponse getById(Long id) {
        log.info("Getting quiz by id: {}", id);
        QuizEntity entity = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return quizMapper.toResponse(entity);
    }

    public List<QuizResponse> getByLessonId(Long lessonId) {
        log.info("Getting quizzes by lesson id: {}", lessonId);
        return quizMapper.toResponseList(quizRepository.findByLessonId(lessonId));
    }

    public List<QuizResponse> getByCourseId(Long courseId) {
        log.info("Getting quizzes by course id: {}", courseId);
        return quizMapper.toResponseList(quizRepository.findByCourseId(courseId));
    }

    public List<QuizResponse> getBySectionId(Long sectionId) {
        log.info("Getting quizzes by section id: {}", sectionId);
        return quizMapper.toResponseList(quizRepository.findBySectionId(sectionId));
    }

    @Transactional
    public QuizResponse create(QuizRequest request) {
        log.info("Creating quiz: {}", request.getTitle());
        QuizEntity entity = quizMapper.toEntity(request);
        QuizEntity saved = quizRepository.save(entity);
        return quizMapper.toResponse(saved);
    }

    @Transactional
    public QuizResponse update(Long id, QuizRequest request) {
        log.info("Updating quiz: {}", id);
        QuizEntity existing = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        quizMapper.updateFromRequest(request, existing);
        QuizEntity updated = quizRepository.save(existing);
        return quizMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting quiz: {}", id);
        if (!quizRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        quizRepository.deleteById(id);
    }
}
