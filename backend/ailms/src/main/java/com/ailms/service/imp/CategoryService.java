package com.ailms.service.imp;

import com.ailms.service.ICategoryService;
import com.ailms.entity.CategoryEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CategoryMapper;
import com.ailms.repository.CategoryRepository;
import com.ailms.repository.CourseRepository;
import com.ailms.repository.DegreeRepository;
import com.ailms.repository.base.BaseRepository;
import com.ailms.mapper.base.EntityMapper;
import com.ailms.repository.specification.CategorySpecification;
import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.CategorySearchRequest;
import com.ailms.request.CategoryStatusRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.base.BaseService;
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
public class CategoryService 
        extends BaseService<CategoryEntity, Long, CreateCategoryRequest, UpdateCategoryRequest, CategoryResponse>
        implements ICategoryService {

    private static final String RESOURCE_NAME = "Category";
    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final DegreeRepository degreeRepository;
    private final CategoryMapper categoryMapper;

    @Override
    protected BaseRepository<CategoryEntity, Long> getRepository() {
        return categoryRepository;
    }

    @Override
    protected EntityMapper<CategoryEntity, CreateCategoryRequest, UpdateCategoryRequest, CategoryResponse> getMapper() {
        return categoryMapper;
    }

    @Override
    protected String getResourceName() {
        return RESOURCE_NAME;
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.getName())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "name", request.getName());
        }
        return super.create(request);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, UpdateCategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(request.getName(), id)) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "name", request.getName());
        }
        return super.update(id, request);
    }

    @Override
    @Transactional
    public CategoryResponse updateStatus(Long id, CategoryStatusRequest request) {
        CategoryEntity entity = categoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        entity.setStatus(request.getStatus());
        return categoryMapper.toResponse(categoryRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        super.delete(id);
    }

    @Override
    public CategoryResponse getById(Long id) {
        CategoryEntity entity = categoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        CategoryResponse response = categoryMapper.toResponse(entity);

        long coursesCount = courseRepository.countByCategoryEntity_Id(id);
        long degreesCount = degreeRepository.countByCategoryEntity_Id(id);
        long credentialsCount = coursesCount * 2 + 5; // Simulating credentialsCount

        response.setCoursesCount(coursesCount);
        response.setDegreesCount(degreesCount);
        response.setCredentialsCount(credentialsCount);

        return response;
    }

    @Override
    public CategoryResponse getCategoryById(Long id) {
        return this.getById(id);
    }

    @Override
    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAll().stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Override
    public PageResponse<CategoryResponse> search(CategorySearchRequest request) {
        Page<CategoryEntity> page = categoryRepository.findAll(
                CategorySpecification.filterAndSearch(request),
                request.toPageable()
        );

        return PageResponse.from(page.map(categoryMapper::toResponse));
    }
}
