package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.QuestionOptionSearchRequest;
import com.ailms.response.QuestionOptionResponse;


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

public interface IQuestionOptionService {
    Page<QuestionOptionResponse> search(QuestionOptionSearchRequest request);
    List<QuestionOptionResponse> getAll();
    QuestionOptionResponse getById(Long id);
    List<QuestionOptionResponse> getByQuestionId(Long questionId);
    QuestionOptionResponse create(QuestionOptionRequest request);
    QuestionOptionResponse update(Long id, QuestionOptionRequest request);
    void delete(Long id);
}
