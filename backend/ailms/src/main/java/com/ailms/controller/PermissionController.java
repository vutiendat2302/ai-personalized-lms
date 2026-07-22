package com.ailms.controller;

import com.ailms.service.IPermissionService;
import com.ailms.response.PageResponse;
import com.ailms.request.PermissionSearchRequest;
import com.ailms.response.PermissionResponse;


import com.ailms.request.PermissionRequest;
import com.ailms.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
