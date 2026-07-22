package com.ailms.service;

import com.ailms.request.AssignPermissionsRequest;
import com.ailms.request.CloneRoleRequest;
import com.ailms.request.PermissionRequest;
import com.ailms.request.RoleRequest;
import com.ailms.request.RoleSearchRequest;
import com.ailms.response.PermissionResponse;
import com.ailms.response.RoleResponse;
import com.ailms.response.UserResponse;
import com.ailms.response.PageResponse;


import java.util.List;

/**
 * Service quản lý các vai trò (Role), gán quyền hạn và phân vai trò cho người dùng.
 */
public interface IRoleService {

    /**
     * Tìm kiếm và phân trang danh sách các vai trò.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return trang kết quả chứa danh sách đã được phân trang
     */
    PageResponse<RoleResponse> getRoles(RoleSearchRequest request);

    /**
     * Lấy toàn bộ danh sách vai trò.
     * @return danh sách các đối tượng phù hợp
     */
    List<RoleResponse> getAllRoles();

    /**
     * Lấy chi tiết vai trò theo ID.
     *
     * @param id ID của bản ghi cần xử lý
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    RoleResponse getRoleById(Long id);

    /**
     * Tạo vai trò mới.
     *
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    RoleResponse createRole(RoleRequest request);

    /**
     * Cập nhật thông tin vai trò.
     *
     * @param id ID của bản ghi cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    RoleResponse updateRole(Long id, RoleRequest request);

    /**
     * Xóa vai trò.
     *
     * @param id ID của bản ghi cần xử lý
     */
    void deleteRole(Long id);

    /**
     * Lấy danh sách các quyền hạn được gán cho vai trò.
     *
     * @param roleId ID của vai trò cần xử lý
     * @return danh sách các đối tượng phù hợp
     */
    List<PermissionResponse> getPermissionsByRoleId(Long roleId);

    /**
     * Lấy danh sách người dùng sở hữu vai trò cụ thể.
     *
     * @param roleId ID của vai trò cần xử lý
     * @return danh sách các đối tượng phù hợp
     */
    List<UserResponse> getUsersByRoleId(Long roleId);

    /**
     * Gán danh sách quyền hạn cho vai trò.
     *
     * @param roleId ID của vai trò cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     */
    void assignPermissions(Long roleId, AssignPermissionsRequest request);

    /**
     * Sao chép vai trò hiện tại sang một vai trò mới.
     *
     * @param roleId ID của vai trò cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    RoleResponse cloneRole(Long roleId, CloneRoleRequest request);

    /**
     * Tạo mới một quyền hạn và gán ngay cho vai trò cụ thể.
     *
     * @param roleId ID của vai trò cần xử lý
     * @param request Đối tượng DTO chứa thông tin yêu cầu
     * @return đối tượng chứa thông tin chi tiết kết quả
     */
    PermissionResponse createAndAssignPermission(Long roleId, PermissionRequest request);
}
