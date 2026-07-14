package com.ailms.service;

import com.ailms.entity.QuestionOptionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuestionOptionMapper;
import com.ailms.repository.QuestionOptionRepository;
import com.ailms.request.QuestionOptionRequest;
import com.ailms.response.QuestionOptionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuestionOptionService {

    private final QuestionOptionRepository questionOptionRepository;
    private final QuestionOptionMapper questionOptionMapper;

    private static final String RESOURCE_NAME = "QuestionOption";

    public List<QuestionOptionResponse> getAll() {
        log.info("Getting all question options");
        return questionOptionMapper.toResponseList(questionOptionRepository.findAll());
    }

    public QuestionOptionResponse getById(Long id) {
        log.info("Getting question option by id: {}", id);
        QuestionOptionEntity entity = questionOptionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return questionOptionMapper.toResponse(entity);
    }

    public List<QuestionOptionResponse> getByQuestionId(Long questionId) {
        log.info("Getting question options by question id: {}", questionId);
        return questionOptionMapper.toResponseList(questionOptionRepository.findByQuestionId(questionId));
    }

    @Transactional
    public QuestionOptionResponse create(QuestionOptionRequest request) {
        log.info("Creating question option for question: {}", request.getQuestionId());
        QuestionOptionEntity entity = questionOptionMapper.toEntity(request);
        QuestionOptionEntity saved = questionOptionRepository.save(entity);
        return questionOptionMapper.toResponse(saved);
    }

    @Transactional
    public QuestionOptionResponse update(Long id, QuestionOptionRequest request) {
        log.info("Updating question option: {}", id);
        QuestionOptionEntity existing = questionOptionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        questionOptionMapper.updateFromRequest(request, existing);
        QuestionOptionEntity updated = questionOptionRepository.save(existing);
        return questionOptionMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting question option: {}", id);
        if (!questionOptionRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        questionOptionRepository.deleteById(id);
    }
}
