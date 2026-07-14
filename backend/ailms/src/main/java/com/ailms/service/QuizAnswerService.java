package com.ailms.service;

import com.ailms.entity.QuizAnswerEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizAnswerMapper;
import com.ailms.repository.QuizAnswerRepository;
import com.ailms.request.QuizAnswerRequest;
import com.ailms.response.QuizAnswerResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuizAnswerService {

    private final QuizAnswerRepository quizAnswerRepository;
    private final QuizAnswerMapper quizAnswerMapper;

    private static final String RESOURCE_NAME = "QuizAnswer";

    public List<QuizAnswerResponse> getAll() {
        log.info("Getting all quiz answers");
        return quizAnswerMapper.toResponseList(quizAnswerRepository.findAll());
    }

    public QuizAnswerResponse getById(Long id) {
        log.info("Getting quiz answer by id: {}", id);
        QuizAnswerEntity entity = quizAnswerRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return quizAnswerMapper.toResponse(entity);
    }

    public List<QuizAnswerResponse> getByAttemptId(Long attemptId) {
        log.info("Getting quiz answers by attempt id: {}", attemptId);
        return quizAnswerMapper.toResponseList(quizAnswerRepository.findByAttemptId(attemptId));
    }

    public List<QuizAnswerResponse> getByQuestionId(Long questionId) {
        log.info("Getting quiz answers by question id: {}", questionId);
        return quizAnswerMapper.toResponseList(quizAnswerRepository.findByQuestionId(questionId));
    }

    @Transactional
    public QuizAnswerResponse create(QuizAnswerRequest request) {
        log.info("Creating quiz answer for attempt: {}", request.getAttemptId());
        QuizAnswerEntity entity = quizAnswerMapper.toEntity(request);
        QuizAnswerEntity saved = quizAnswerRepository.save(entity);
        return quizAnswerMapper.toResponse(saved);
    }

    @Transactional
    public QuizAnswerResponse update(Long id, QuizAnswerRequest request) {
        log.info("Updating quiz answer: {}", id);
        QuizAnswerEntity existing = quizAnswerRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        quizAnswerMapper.updateFromRequest(request, existing);
        QuizAnswerEntity updated = quizAnswerRepository.save(existing);
        return quizAnswerMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting quiz answer: {}", id);
        if (!quizAnswerRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        quizAnswerRepository.deleteById(id);
    }
}
