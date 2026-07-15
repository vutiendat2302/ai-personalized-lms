package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.QuizAnswerSearchRequest;
import com.ailms.response.QuizAnswerResponse;


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

public interface IQuizAnswerService {
    Page<QuizAnswerResponse> search(QuizAnswerSearchRequest request);
    List<QuizAnswerResponse> getAll();
    QuizAnswerResponse getById(Long id);
    List<QuizAnswerResponse> getByAttemptId(Long attemptId);
    List<QuizAnswerResponse> getByQuestionId(Long questionId);
    QuizAnswerResponse create(QuizAnswerRequest request);
    QuizAnswerResponse update(Long id, QuizAnswerRequest request);
    void delete(Long id);
}
