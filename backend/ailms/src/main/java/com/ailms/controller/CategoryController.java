package com.ailms.controller;

import com.ailms.controller.base.BaseController;
import com.ailms.request.CategorySearchRequest;
import com.ailms.request.CategoryStatusRequest;
import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.imp.CategoryService;
import com.ailms.service.base.BaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/categories")
@RequiredArgsConstructor
public class CategoryController extends BaseController<CreateCategoryRequest, UpdateCategoryRequest, CategoryResponse, Long> {

    private final CategoryService categoryService;

    @Override
    protected BaseService<?, Long, CreateCategoryRequest, UpdateCategoryRequest, CategoryResponse> getService() {
        return categoryService;
    }

    @Override
    protected String getResourceName() {
        return "Category";
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody CategoryStatusRequest request) {
        CategoryResponse response = categoryService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.of("Category status updated successfully", response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<CategoryResponse>>> search(CategorySearchRequest request) {
        PageResponse<CategoryResponse> response = categoryService.search(request);
        return ResponseEntity.ok(ApiResponse.of(response));
    }
}