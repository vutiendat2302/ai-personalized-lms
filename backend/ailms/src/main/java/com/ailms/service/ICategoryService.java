package com.ailms.service;

import com.ailms.request.CreateCategoryRequest;
import com.ailms.request.CategorySearchRequest;
import com.ailms.request.CategoryStatusRequest;
import com.ailms.request.UpdateCategoryRequest;
import com.ailms.response.CategoryResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý danh mục khóa học (Category).
 */
public interface ICategoryService {

    /**
     * Tạo danh mục khóa học mới.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CategoryResponse createCategory(CreateCategoryRequest request);

    /**
     * Cập nhật thông tin danh mục khóa học.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CategoryResponse updateCategory(Long id, UpdateCategoryRequest request);

    /**
     * Cập nhật trạng thái hoạt động của danh mục.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CategoryResponse updateStatus(Long id, CategoryStatusRequest request);

    /**
     * Xóa bản ghi khỏi hệ thống theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void delete(Long id);

    /**
     * Lấy thông tin danh mục theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    CategoryResponse getCategoryById(Long id);

    /**
     * Lấy toàn bộ danh sách danh mục.
     * @return danh sách các đối tượng phù hợp
     */
    List<CategoryResponse> getCategories();

    /**
     * Tìm kiếm và phân trang danh sách dựa trên các tiêu chí lọc.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<CategoryResponse> search(CategorySearchRequest request);
}
