package com.ailms.service;

import com.ailms.request.PermissionRequest;
import com.ailms.request.PermissionSearchRequest;
import com.ailms.response.PermissionResponse;
import com.ailms.response.PageResponse;

import java.util.List;

public interface IPermissionService {

    PageResponse<PermissionResponse> getPermissions(PermissionSearchRequest request);

    // Get all
    List<PermissionResponse> getAllPermissions();
    PermissionResponse getPermissionById(Long id);

    PermissionResponse createPermission(PermissionRequest request);

    PermissionResponse updatePermission(Long id, PermissionRequest request);

    void deletePermission(Long id);
}
