package com.ailms.service.imp;

import com.ailms.entity.DegreeEntity;
import com.ailms.mapper.DegreeMapper;
import com.ailms.repository.DegreeRepository;
import com.ailms.repository.specification.DegreeSpecification;
import com.ailms.request.DegreeSearchRequest;
import com.ailms.response.DegreeResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.IDegreeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DegreeService implements IDegreeService {

    private final DegreeRepository degreeRepository;
    private final DegreeMapper degreeMapper;

    @Override
    public PageResponse<DegreeResponse> search(DegreeSearchRequest request) {
        log.info("Searching degrees with categoryId: {}, type: {}", request.getCategoryId(), request.getType());
        Page<DegreeEntity> page = degreeRepository.findAll(
                DegreeSpecification.filterAndSearch(request),
                request.toPageable()
        );
        return PageResponse.from(page.map(degreeMapper::toResponse));
    }

    @Override
    public List<DegreeResponse> getDegreesByCategoryId(Long categoryId) {
        log.info("Fetching degrees by categoryId: {}", categoryId);
        DegreeSearchRequest request = new DegreeSearchRequest();
        request.setCategoryId(categoryId);
        request.setStatus(com.ailms.entity.enums.BaseStatusEnum.ACTIVE);
        
        return degreeRepository.findAll(DegreeSpecification.filterAndSearch(request)).stream()
                .map(degreeMapper::toResponse)
                .toList();
    }
}
