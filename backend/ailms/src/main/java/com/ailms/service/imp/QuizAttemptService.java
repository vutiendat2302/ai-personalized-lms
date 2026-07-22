package com.ailms.service.imp;

import com.ailms.repository.specification.QuizAttemptSpecification;
import com.ailms.request.QuizAttemptSearchRequest;
import com.ailms.service.IQuizAttemptService;

import com.ailms.entity.QuizAttemptEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizAttemptMapper;
import com.ailms.repository.QuizAttemptRepository;
import com.ailms.request.QuizAttemptRequest;
import com.ailms.response.QuizAttemptResponse;
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
public class QuizAttemptService implements IQuizAttemptService {
    @Override
    public PageResponse<QuizAttemptResponse> search(QuizAttemptSearchRequest request) {
        log.info("Searching QuizAttempt via specification");
        Specification<QuizAttemptEntity> spec = QuizAttemptSpecification.filterAndSearch(request);
        Pageable pageable = request.toPageable();
        Page<QuizAttemptEntity> page = quizAttemptRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(quizAttemptMapper::toResponse));
    }

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptMapper quizAttemptMapper;

    private static final String RESOURCE_NAME = "QuizAttempt";

    public List<QuizAttemptResponse> getAll() {
        log.info("Getting all quiz attempts");
        return quizAttemptMapper.toResponseList(quizAttemptRepository.findAll());
    }

    public QuizAttemptResponse getById(Long id) {
        log.info("Getting quiz attempt by id: {}", id);
        QuizAttemptEntity entity = quizAttemptRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        return quizAttemptMapper.toResponse(entity);
    }

    public List<QuizAttemptResponse> getByQuizId(Long quizId) {
        log.info("Getting quiz attempts by quiz id: {}", quizId);
        return quizAttemptMapper.toResponseList(quizAttemptRepository.findByQuizId(quizId));
    }

    public List<QuizAttemptResponse> getByUserId(Long userId) {
        log.info("Getting quiz attempts by user id: {}", userId);
        return quizAttemptMapper.toResponseList(quizAttemptRepository.findByUserId(userId));
    }

    public List<QuizAttemptResponse> getByEnrollmentId(Long enrollmentId) {
        log.info("Getting quiz attempts by enrollment id: {}", enrollmentId);
        return quizAttemptMapper.toResponseList(quizAttemptRepository.findByEnrollmentId(enrollmentId));
    }

    @Transactional
    public QuizAttemptResponse create(QuizAttemptRequest request) {
        log.info("Creating quiz attempt for quiz: {}", request.getQuizId());
        QuizAttemptEntity entity = quizAttemptMapper.toEntity(request);
        QuizAttemptEntity saved = quizAttemptRepository.save(entity);
        return quizAttemptMapper.toResponse(saved);
    }

    @Transactional
    public QuizAttemptResponse update(Long id, QuizAttemptRequest request) {
        log.info("Updating quiz attempt: {}", id);
        QuizAttemptEntity existing = quizAttemptRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        quizAttemptMapper.updateFromRequest(request, existing);
        QuizAttemptEntity updated = quizAttemptRepository.save(existing);
        return quizAttemptMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting quiz attempt: {}", id);
        if (!quizAttemptRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        quizAttemptRepository.deleteById(id);
    }
}
