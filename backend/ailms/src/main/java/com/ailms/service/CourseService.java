package com.ailms.service;

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
import com.ailms.request.CourseSearchRequest;
import com.ailms.request.CourseStatusRequest;
import com.ailms.request.CreateCourseRequest;
import com.ailms.request.UpdateCourseRequest;
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
public class CourseService implements ICourseService {

    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final CourseMapper courseMapper;

    @Override
    public List<CourseResponse> getAll() {
        log.info("Getting all courses");
        return courseRepository.findAll()
                .stream()
                .map(courseMapper::toResponse)
                .toList();
    }


    @Override
    @Transactional
    public CourseResponse create(CreateCourseRequest request) {
        log.info("Creating course with name: {}", request.getName());

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));

        log.info("Category found");

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
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        CategoryEntity category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));

        String link = request.getLink();
        if (link == null || link.trim().isEmpty()) {
            link = generateSlug(request.getName());
        }

        if (courseRepository.existsByLinkIgnoreCaseAndIdNot(link, id)) {
            throw new DuplicateResourceException("Course with link '" + link + "' already exists");
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
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        existingEntity.setStatus(request.getStatus());

        CourseEntity updatedEntity = courseRepository.save(existingEntity);
        return courseMapper.toResponse(updatedEntity);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Deleting course with id: {}", id);
        
        if (!courseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Course not found with id: " + id);
        }
        
        courseRepository.deleteById(id);
    }

    @Override
    public CourseResponse getById(Long id) {
        log.info("Getting course by id: {}", id);

        CourseEntity entity = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        return courseMapper.toResponse(entity);
    }

    @Override
    public PageResponse<CourseResponse> search(CourseSearchRequest request) {
        log.info("Searching courses with keyword: {}", request.getKeyword());

        Specification<CourseEntity> spec = CourseSpecification.buildSpec(request);
        Pageable pageable = request.toPageable();

        Page<CourseEntity> pageResult = courseRepository.findAll(spec, pageable);
        Page<CourseResponse> responsePage = pageResult.map(courseMapper::toResponse);

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
