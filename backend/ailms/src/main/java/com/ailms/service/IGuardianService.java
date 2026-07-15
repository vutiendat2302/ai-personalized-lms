package com.ailms.service;

import org.springframework.data.domain.Page;
import com.ailms.request.GuardianSearchRequest;
import com.ailms.response.GuardianResponse;


import com.ailms.entity.GuardianEntity;
import com.ailms.entity.StudentProfileEntity;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.GuardianMapper;
import com.ailms.repository.GuardianRepository;
import com.ailms.repository.StudentProfileRepository;
import com.ailms.request.GuardianRequest;
import com.ailms.response.GuardianResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface IGuardianService {
    Page<GuardianResponse> search(GuardianSearchRequest request);
    List<GuardianResponse> getAll();
    GuardianResponse getById(Long id);
    List<GuardianResponse> getByStudentUserId(Long studentUserId);
    GuardianResponse create(GuardianRequest request);
    GuardianResponse update(Long id, GuardianRequest request);
    void delete(Long id);
}
