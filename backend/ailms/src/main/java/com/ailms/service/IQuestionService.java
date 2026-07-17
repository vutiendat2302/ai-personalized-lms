package com.ailms.service;

import com.ailms.response.PageResponse;
import com.ailms.request.QuestionSearchRequest;
import com.ailms.response.QuestionResponse;

import com.ailms.entity.QuestionEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.QuestionMapper;
import com.ailms.repository.QuestionRepository;
import com.ailms.request.QuestionRequest;
import com.ailms.response.QuestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IQuestionService {
    PageResponse<QuestionResponse> search(QuestionSearchRequest request);

    List<QuestionResponse> getAll();

    QuestionResponse getById(Long id);

    List<QuestionResponse> getByQuizId(Long quizId);

    QuestionResponse create(QuestionRequest request);

    QuestionResponse update(Long id, QuestionRequest request);

    void delete(Long id);
}
