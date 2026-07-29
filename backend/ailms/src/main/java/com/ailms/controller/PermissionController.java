package com.ailms.controller;

import com.ailms.response.*;
import com.ailms.service.IPermissionService;
import com.ailms.request.PermissionSearchRequest;


import com.ailms.request.PermissionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("${api.prefix}/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final IPermissionService permissionService;

    @GetMapping("/page")
    public ResponseEntity<ApiResponse<PageResponse<PermissionResponse>>> getPermissions(PermissionSearchRequest request) {
        PageResponse<PermissionResponse> response = permissionService.getPermissions(request);
        return ResponseEntity.ok(ApiResponse.of("Permissions retrieved successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        return ResponseEntity.ok(ApiResponse.of("Get All Permission successfully", permissionService.getAllPermissions()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PermissionResponse>> getPermissionById(@PathVariable Long id) {
        PermissionResponse response = permissionService.getPermissionById(id);
        return ResponseEntity.ok(ApiResponse.of("Permission retrieved successfully", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PermissionResponse>> createPermission(@Valid @RequestBody PermissionRequest request) {
        PermissionResponse response = permissionService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Permission created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PermissionResponse>> updatePermission(
            @PathVariable Long id, @Valid @RequestBody PermissionRequest request) {
        PermissionResponse response = permissionService.updatePermission(id, request);
        return ResponseEntity.ok(ApiResponse.of("Permission updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePermission(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.ok(ApiResponse.message("Permission deleted successfully"));
    }

    @GetMapping("/stats/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverviewStats() {
        return ResponseEntity.ok(ApiResponse.of("Permission overview stats", permissionService.getPermissionOverviewStats()));
    }

    @GetMapping("/{id}/roles")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getRolesByPermissionId(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Roles using permission retrieved", permissionService.getRolesByPermissionId(id)));
    }

    @GetMapping("/{id}/roles/count")
    public ResponseEntity<ApiResponse<Long>> countRolesByPermissionId(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.of("Count roles using permission retrieved successfully", permissionService.countRolesByPermissionId(id)));
    }

    @DeleteMapping("/{id}/roles/{roleId}")
    public ResponseEntity<ApiResponse<Void>> removeRoleFromPermission(
            @PathVariable Long id, @PathVariable Long roleId) {
        permissionService.removeRoleFromPermission(id, roleId);
        return ResponseEntity.ok(ApiResponse.message("Role removed from permission successfully"));
    }

    @PostMapping("/{id}/roles/{roleId}")
    public ResponseEntity<ApiResponse<Void>> assignRoleToPermission(
            @PathVariable Long id, @PathVariable Long roleId) {
        permissionService.assignRoleToPermission(id, roleId);
        return ResponseEntity.ok(ApiResponse.message("Role assigned to permission successfully"));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<Void>> bulkDeletePermissions(@RequestBody List<Long> permissionIds) {
        permissionService.bulkDeletePermissions(permissionIds);
        return ResponseEntity.ok(ApiResponse.message("Bulk permissions deleted successfully"));
    }

    @GetMapping("/metadata")
    public ResponseEntity<ApiResponse<PermissionMetadataResponse>> getPermissionMetadata() {
        return ResponseEntity.ok(ApiResponse.of("Permission metadata retrieved successfully", permissionService.getPermissionMetadata()));
    }
}

