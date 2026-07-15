package com.ailms.service.imp;
import com.ailms.repository.specification.QuestionSpecification;
import com.ailms.request.QuestionSearchRequest;
import com.ailms.service.IQuestionService;


import com.ailms.entity.QuestionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuestionMapper;
import com.ailms.repository.QuestionRepository;
import com.ailms.request.QuestionRequest;
import com.ailms.response.QuestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuestionService implements IQuestionService {
    @Override
    public Page<QuestionResponse> search(QuestionSearchRequest request) {
        log.info("Searching Question via specification");
        Specification<QuestionEntity> spec = QuestionSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<QuestionEntity> page = questionRepository.findAll(spec, pageable);
        return page.map(questionMapper::toResponse);
    }


    private final QuestionRepository questionRepository;
    private final QuestionMapper questionMapper;

    private static final String RESOURCE_NAME = "Question";

    public List<QuestionResponse> getAll() {
        log.info("Getting all questions");
        return questionMapper.toResponseList(questionRepository.findAll());
    }

    public QuestionResponse getById(Long id) {
        log.info("Getting question by id: {}", id);
        QuestionEntity entity = questionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return questionMapper.toResponse(entity);
    }

    public List<QuestionResponse> getByQuizId(Long quizId) {
        log.info("Getting questions by quiz id: {}", quizId);
        return questionMapper.toResponseList(questionRepository.findByQuizId(quizId));
    }

    @Transactional
    public QuestionResponse create(QuestionRequest request) {
        log.info("Creating question for quiz: {}", request.getQuizId());
        QuestionEntity entity = questionMapper.toEntity(request);
        QuestionEntity saved = questionRepository.save(entity);
        return questionMapper.toResponse(saved);
    }

    @Transactional
    public QuestionResponse update(Long id, QuestionRequest request) {
        log.info("Updating question: {}", id);
        QuestionEntity existing = questionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        questionMapper.updateFromRequest(request, existing);
        QuestionEntity updated = questionRepository.save(existing);
        return questionMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting question: {}", id);
        if (!questionRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        questionRepository.deleteById(id);
    }
}
