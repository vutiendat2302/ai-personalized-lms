package com.ailms.service;

import com.ailms.repository.specification.CategorySpecification;
import com.ailms.request.*;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;
import com.ailms.entity.CategoryEntity;
import com.ailms.entity.CourseEntity;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CourseMapper;
import com.ailms.repository.CategoryRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.specification.CourseSpecification;
import com.ailms.response.CourseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j // Tự sinh log cho class
@Transactional(readOnly = true)
public class CourseService implements ICourseService {

    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final CourseMapper courseMapper;
    private static final String RESOURCE_NAME = "Course";

    @Override
    public List<CourseResponse> getAll() {
        log.info("Getting all courses");
        return courseRepository.findAll()
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }


    @Override
    public CourseResponse create(CreateCourseRequest request) {
        log.info("Creating course with name: {}", request.getName());

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.of("Category ", request.getCategoryId()));

        if (courseRepository.existsByNameIgnoreCaseAndCategoryEntity_Id(request.getName(), request.getCategoryId())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "Category ID and name", request.getName());
        }

        String link = request.getLink();
        if (link == null || link.trim().isEmpty()) {
            link = generateSlug(request.getName());
        }

        CourseEntity entity = courseMapper.toEntity(request);
        entity.setCategoryEntity(category);
        entity.setLink(link);
        
        // Status is initialized to 0 by default in CourseEntity

        CourseEntity savedEntity = courseRepository.save(entity);
        return courseMapper.toResponse(savedEntity);
    }


    @Override
    @Transactional
    public CourseResponse update(Long id, UpdateCourseRequest request) {
        log.info("Updating course with id: {}", id);

        CourseEntity existingEntity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> ResourceNotFoundException.of("Category", request.getCategoryId()));

        String link = request.getLink();
        if (link == null || link.trim().isEmpty()) {
            link = generateSlug(request.getName());
        }

        courseMapper.updateEntityFromRequest(request, existingEntity);
        existingEntity.setCategoryEntity(category);
        existingEntity.setLink(link);

        CourseEntity updatedEntity = courseRepository.save(existingEntity);
        return courseMapper.toResponse(updatedEntity);
    }

    @Override
    @Transactional
    public CourseResponse updateStatus(Long id, CourseStatusRequest request) {
        log.info("Updating status for course id: {} to {}", id, request.getStatus());

        CourseEntity existingEntity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        existingEntity.setStatus(request.getStatus());

        CourseEntity updatedEntity = courseRepository.save(existingEntity);
        return courseMapper.toResponse(updatedEntity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting course with id: {}", id);
        
        if (!courseRepository.existsById(id)) {
            throw ResourceNotFoundException.of(RESOURCE_NAME, id);
        }
        
        courseRepository.deleteById(id);
    }

    @Override
    public CourseResponse getById(Long id) {
        log.info("Getting course by id: {}", id);

        CourseEntity entity = courseRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        return courseMapper.toResponse(entity);
    }

    @Override
    public PageResponse<CourseResponse> search(CourseSearchRequest request) {
        log.info("Searching courses with keyword: {}", request.getKeyword());

        Page<CourseEntity> page = courseRepository.findAll(
                CourseSpecification.build(request),
                request.toPageable()
        );

        Page<CourseResponse> responsePage = page.map(courseMapper::toResponse);

        return PageResponse.from(responsePage);
    }

    private String generateSlug(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String slug = pattern.matcher(normalized).replaceAll("");
        return slug.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .trim();
    }

}
