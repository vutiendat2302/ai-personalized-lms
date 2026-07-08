package com.ailms.controller;

import com.ailms.request.AssignPermissionsRequest;
import com.ailms.request.RoleRequest;
import com.ailms.request.CloneRoleRequest;
import com.ailms.response.ApiResponse;
import com.ailms.response.RoleResponse;
import com.ailms.response.UserResponse;
import com.ailms.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<RoleResponse>>> getRoles(
            @RequestParam(required = false) Boolean isSystem,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<RoleResponse> response = roleService.getRoles(isSystem, search, pageable);
        return ResponseEntity.ok(ApiResponse.of("Roles retrieved successfully", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable Long id) {
        RoleResponse response = roleService.getRoleById(id);
        return ResponseEntity.ok(ApiResponse.of("Role retrieved successfully", response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(@Valid @RequestBody RoleRequest request) {
        RoleResponse response = roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Role created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRole(
            @PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        RoleResponse response = roleService.updateRole(id, request);
        return ResponseEntity.ok(ApiResponse.of("Role updated successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.message("Role deleted successfully"));
    }

    @PostMapping("/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assignPermissions(
            @PathVariable Long id, @Valid @RequestBody AssignPermissionsRequest request) {
        roleService.assignPermissions(id, request);
        return ResponseEntity.ok(ApiResponse.message("Permissions assigned successfully"));
    }

    @PostMapping("/{id}/clone")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RoleResponse>> cloneRole(
            @PathVariable Long id, @Valid @RequestBody CloneRoleRequest request) {
        RoleResponse response = roleService.cloneRole(id, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Role cloned successfully", response));
    }

    @GetMapping("/{id}/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsersByRoleId(@PathVariable Long id) {
        List<UserResponse> response = roleService.getUsersByRoleId(id);
        return ResponseEntity.ok(ApiResponse.of("Users under role retrieved successfully", response));
    }
}
