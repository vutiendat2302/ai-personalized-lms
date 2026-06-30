package com.ailms.service;

import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.CategorySearchRequest;
import com.ailms.request.CategoryStatusRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface ICategoryService {

    CategoryResponse createCategory(CreateCategoryRequest request);
    CategoryResponse updateCategory(Long id, UpdateCategoryRequest request);

    CategoryResponse updateStatus(Long id, CategoryStatusRequest request);

    void delete(Long id);

    CategoryResponse getCategoryById(Long id);

    List<CategoryResponse> getCategories();

    /**
     * Tìm kiếm + filter + phân trang: search theo name, filter theo status, khoảng ngày tạo
     */
    PageResponse<CategoryResponse> search(CategorySearchRequest request);

}
