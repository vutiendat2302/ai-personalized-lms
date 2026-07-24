package com.ailms.service;

import com.ailms.request.PermissionRequest;
import com.ailms.request.PermissionSearchRequest;
import com.ailms.response.PermissionResponse;
import com.ailms.response.PageResponse;

import java.util.List;

/**
 * Service quản lý danh mục các quyền hạn (Permission) trong hệ thống.
 */
public interface IPermissionService {

    /**
     * Tìm kiếm phân trang danh sách các quyền hạn hệ thống.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<PermissionResponse> getPermissions(PermissionSearchRequest request);

    /**
     * Lấy danh sách toàn bộ các quyền hạn.
     * @return danh sách các đối tượng phù hợp
     */
    List<PermissionResponse> getAllPermissions();

    /**
     * Lấy thông tin quyền hạn theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    PermissionResponse getPermissionById(Long id);

    /**
     * Tạo quyền hạn mới.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    PermissionResponse createPermission(PermissionRequest request);

    /**
     * Cập nhật thông tin quyền hạn.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    PermissionResponse updatePermission(Long id, PermissionRequest request);

    /**
     * Xóa quyền hạn theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void deletePermission(Long id);
}
