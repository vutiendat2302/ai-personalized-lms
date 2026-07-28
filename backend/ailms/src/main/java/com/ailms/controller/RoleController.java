package com.ailms.controller;

import com.ailms.response.PageResponse;
import com.ailms.request.RoleSearchRequest;
import com.ailms.response.RoleResponse;


import com.ailms.request.AssignPermissionsRequest;
import com.ailms.request.PermissionRequest;
import com.ailms.request.RoleRequest;
import com.ailms.request.CloneRoleRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.PermissionResponse;
import com.ailms.response.UserResponse;
import com.ailms.service.IRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("${api.prefix}/roles")
@RequiredArgsConstructor
public class RoleController {

    private final IRoleService roleService;

    @GetMapping("/page")
    public ResponseEntity<ApiResponse<PageResponse<RoleResponse>>> getRoles(RoleSearchRequest request) {
        PageResponse<RoleResponse> response = roleService.getRoles(request);
        return ResponseEntity.ok(ApiResponse.of("Roles retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        return ResponseEntity.ok(ApiResponse.of("Get All Roles", roleService.getAllRoles()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable Long id) {
        RoleResponse response = roleService.getRoleById(id);
        return ResponseEntity.ok(ApiResponse.of("Role retrieved successfully", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(@Valid @RequestBody RoleRequest request) {
        RoleResponse response = roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Role created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        RoleResponse response = roleService.updateRole(id, request);
        return ResponseEntity.ok(ApiResponse.of("Role updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.message("Role deleted successfully"));
    }

// Gán permissions cho role
    @PostMapping("/{id}/permissions")
    public ResponseEntity<ApiResponse<Void>> assignPermissions(
            @PathVariable Long id, @Valid @RequestBody AssignPermissionsRequest request) {
        roleService.assignPermissions(id, request);
        return ResponseEntity.ok(ApiResponse.message("Permissions assigned successfully"));
    }

    @PostMapping("/{id}/clone")
    public ResponseEntity<ApiResponse<RoleResponse>> cloneRole(
            @PathVariable Long id, @Valid @RequestBody CloneRoleRequest request) {
        RoleResponse response = roleService.cloneRole(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Role cloned successfully", response));
    }

    @GetMapping("/{id}/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsersByRoleId(@PathVariable Long id) {
        List<UserResponse> response = roleService.getUsersByRoleId(id);
        return ResponseEntity.ok(ApiResponse.of("Users under role retrieved successfully", response));
    }

    @GetMapping("/{roleId}/permissions")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissionsByRoleId(@PathVariable Long roleId) {
        return ResponseEntity.ok(ApiResponse.of("Permissions by role id completed", roleService.getPermissionsByRoleId(roleId)));
    }

    @PostMapping("/{id}/permissions/create")
    public ResponseEntity<ApiResponse<PermissionResponse>> createAndAssignPermission(
            @PathVariable Long id, @Valid @RequestBody PermissionRequest request) {
        PermissionResponse response = roleService.createAndAssignPermission(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Permission created and assigned to role successfully", response));
    }

    @GetMapping("/stats/overview")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getOverviewStats() {
        return ResponseEntity.ok(ApiResponse.of("Role overview stats", roleService.getRoleOverviewStats()));
    }

    @GetMapping("/stats/permissions-distribution")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getPermissionsDistribution() {
        return ResponseEntity.ok(ApiResponse.of("Permissions distribution", roleService.getRolePermissionsDistribution()));
    }

    @DeleteMapping("/{roleId}/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeUserFromRole(@PathVariable Long roleId, @PathVariable Long userId) {
        roleService.removeUserFromRole(roleId, userId);
        return ResponseEntity.ok(ApiResponse.message("User removed from role successfully"));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<Void>> bulkDeleteRoles(@RequestBody List<Long> roleIds) {
        roleService.bulkDeleteCustomRoles(roleIds);
        return ResponseEntity.ok(ApiResponse.message("Bulk roles deleted successfully"));
    }
}

