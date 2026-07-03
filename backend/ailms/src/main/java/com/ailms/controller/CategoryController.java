package com.ailms.controller;


import com.ailms.request.CategorySearchRequest;
import com.ailms.request.CategoryStatusRequest;
import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;
import com.ailms.service.ICategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final ICategoryService categoryService;

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> create(
            @Valid @RequestBody CreateCategoryRequest request) {
        CategoryResponse response = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Category created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCategoryRequest request) {
        CategoryResponse response = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.of("Category updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody CategoryStatusRequest request) {
        CategoryResponse response = categoryService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.of("Category status updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        categoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.message("Category deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getById(@PathVariable Long id) {
        CategoryResponse response = categoryService.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * Lấy toàn bộ category, không phân trang (dùng cho dropdown, filter list...).
     * Nếu cần phân trang/tìm kiếm thì dùng GET /api/categories/search.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAll() {
        List<CategoryResponse> response = categoryService.getCategories();
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * Search + filter + phân trang.
     * Vd: GET /api/categories/search?name=java&status=1&createdFrom=2026-06-01&createdTo=2026-06-30&page=0&size=10&sortBy=name&sortDirection=ASC
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<CategoryResponse>>> search(
            @ModelAttribute CategorySearchRequest request) {
        PageResponse<CategoryResponse> response = categoryService.search(request);
        return ResponseEntity.ok(ApiResponse.of(response));
    }
}