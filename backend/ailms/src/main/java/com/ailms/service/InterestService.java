package com.ailms.service;

import com.ailms.entity.InterestEntity;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.InterestMapper;
import com.ailms.repository.InterestRepository;
import com.ailms.repository.StudentInterestRepository;
import com.ailms.repository.specification.InterestSpecification;
import com.ailms.request.*;
import com.ailms.response.InterestResponse;
import com.ailms.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InterestService implements IInterestService {

    private static final String RESOURCE_NAME = "Interest";

    private final InterestRepository interestRepository;
    private final StudentInterestRepository studentInterestRepository;
    private final InterestMapper interestMapper;

    @Override
    @Transactional
    public InterestResponse createInterest(CreateInterestRequest request) {
        if (interestRepository.existsByCodeIgnoreCase(request.getCode())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "code", request.getCode());
        }

        InterestEntity entity = interestMapper.toInterestEntity(request);
        return interestMapper.toInterestResponse(interestRepository.save(entity));
    }

    @Override
    @Transactional
    public InterestResponse updateInterest(Long id, UpdateInterestRequest request) {
        InterestEntity entity = findEntityById(id);

        if (interestRepository.existsByCodeIgnoreCaseAndIdNot(request.getCode(), id)) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "code", request.getCode());
        }

        interestMapper.updateInterestEntity(entity, request);
        return interestMapper.toInterestResponse(interestRepository.save(entity));
    }

    @Override
    @Transactional
    public InterestResponse updateStatus(Long id, InterestStatusRequest request) {
        InterestEntity entity = findEntityById(id);
        entity.setStatus(request.getStatus());
        return interestMapper.toInterestResponse(interestRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        findEntityById(id);

        if (studentInterestRepository.existsByInterest_Id(id)) {
            throw new BusinessException("Cannot delete interest that is assigned to students");
        }

        interestRepository.deleteById(id);
    }

    @Override
    public InterestResponse getInterestById(Long id) {
        return interestMapper.toInterestResponse(findEntityById(id));
    }

    @Override
    public List<InterestResponse> getInterests() {
        return interestRepository.findAll().stream()
                .map(interestMapper::toInterestResponse)
                .toList();
    }

    @Override
    public PageResponse<InterestResponse> search(InterestSearchRequest request) {
        Page<InterestEntity> page = interestRepository.findAll(
                InterestSpecification.filterAndSearch(request),
                request.toPageable()
        );

        return PageResponse.from(page.map(interestMapper::toInterestResponse));
    }

    private InterestEntity findEntityById(Long id) {
        return interestRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }
}
