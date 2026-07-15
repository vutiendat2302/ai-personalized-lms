package com.ailms.service.imp;
import com.ailms.service.ICategoryService;


import com.ailms.entity.CategoryEntity;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.CategoryMapper;
import com.ailms.repository.CategoryRepository;
import com.ailms.repository.specification.CategorySpecification;
import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.CategorySearchRequest;
import com.ailms.request.CategoryStatusRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor // Tự sinh construction cho các field final hoặc được đánh dấu @Nonnull
@Transactional(readOnly = true)
/**
 * Áp dụng cho tất cả method trong class mặc định hcir đọc (tiết kiệm, tăng hiệu năng)
 * Nếu muốn update, save, delete, ... != read thì trước các method thêm @Transactional
 */
public class CategoryService implements ICategoryService{

    private static final String RESOURCE_NAME = "Category";
    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    @Override
    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.getName())) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "name", request.getName());
        }

        CategoryEntity entity = categoryMapper.toCategoryEntity(request);
        return categoryMapper.toCategoryResponse(categoryRepository.save(entity));
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, UpdateCategoryRequest request) {
        CategoryEntity categoryEntity = categoryRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));

        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(request.getName(), id)) {
            throw DuplicateResourceException.of(RESOURCE_NAME, "name", request.getName());
        }

        categoryMapper.updateCategoryEntity(categoryEntity, request);
        return categoryMapper.toCategoryResponse(categoryRepository.save(categoryEntity));
    }

    @Override
    @Transactional
    public CategoryResponse updateStatus(Long id, CategoryStatusRequest request) {
        CategoryEntity entity = categoryRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        entity.setStatus(request.getStatus());
        return categoryMapper.toCategoryResponse(categoryRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        CategoryEntity entity = categoryRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
        categoryRepository.delete(entity);
    }

    @Override
    public CategoryResponse getCategoryById(Long id) {
        CategoryEntity entity = findEntityById(id);
        //long courseCount = categoryRepository.countCoursesByCategoryId(id);

        return categoryMapper.toCategoryResponse(entity);
    }

    @Override
    public List<CategoryResponse> getCategories() {
        return categoryRepository.findAll().stream()
                .map(categoryMapper::toCategoryResponse)
                .toList();
    }

    @Override
    public PageResponse<CategoryResponse> search(CategorySearchRequest request) {
        Page<CategoryEntity> page = categoryRepository.findAll(
                CategorySpecification.filterAndSearch(request),
                request.toPageable()
        );

        Page<CategoryResponse> responsePage = page.map(categoryMapper::toCategoryResponse);

        return PageResponse.from(responsePage);
    }

    private CategoryEntity findEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of(RESOURCE_NAME, id));
    }
}
