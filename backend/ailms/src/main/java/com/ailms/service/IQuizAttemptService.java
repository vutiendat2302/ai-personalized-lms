package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuizAttemptSearchRequest;
import com.ailms.response.QuizAttemptResponse;

import com.ailms.entity.QuizAttemptEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuizAttemptMapper;
import com.ailms.repository.QuizAttemptRepository;
import com.ailms.request.QuizAttemptRequest;
import com.ailms.response.QuizAttemptResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IQuizAttemptService {
    PageResponse<QuizAttemptResponse> search(QuizAttemptSearchRequest request);

    List<QuizAttemptResponse> getAll();

    QuizAttemptResponse getById(Long id);

    List<QuizAttemptResponse> getByQuizId(Long quizId);

    List<QuizAttemptResponse> getByUserId(Long userId);

    List<QuizAttemptResponse> getByEnrollmentId(Long enrollmentId);

    QuizAttemptResponse create(QuizAttemptRequest request);

    QuizAttemptResponse update(Long id, QuizAttemptRequest request);

    void delete(Long id);
}
