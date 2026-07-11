package com.ailms.service;

import com.ailms.request.AssignPermissionsRequest;
import com.ailms.request.CloneRoleRequest;
import com.ailms.request.PermissionRequest;
import com.ailms.request.RoleRequest;
import com.ailms.response.PermissionResponse;
import com.ailms.response.RoleResponse;
import com.ailms.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;


import java.util.List;

public interface IRoleService {

    // Page
    Page<RoleResponse> getRoles(Boolean isSystem, String search, Pageable pageable);

    List<RoleResponse> getAllRoles();

    RoleResponse getRoleById(Long id);

    RoleResponse createRole(RoleRequest request);

    RoleResponse updateRole(Long id, RoleRequest request);

    void deleteRole(Long id);

    // Lay danh sach permission cua roleId
    List<PermissionResponse> getPermissionsByRoleId(Long roleId);

    // Lay tat ca user co roleId
    List<UserResponse> getUsersByRoleId(Long roleId);

    /**
     * Cập nhật danh sách Permission của Role.
     * Thực hiện đồng bộ toàn bộ Permission:
     * - Xóa các Permission không còn trong danh sách mới.
     * - Thêm các Permission mới chưa được gán.
     * - Giữ nguyên các Permission đã tồn tại.
     */
    void assignPermissions(Long roleId, AssignPermissionsRequest request);

    /**
     * Clone role cung toan bo perimission tao mot role moi
     */
    RoleResponse cloneRole(Long roleId, CloneRoleRequest request);

    /**
     * Tạo một Permission mới và gán trực tiếp cho Role.
     */
    PermissionResponse createAndAssignPermission(Long roleId, PermissionRequest request);
}
