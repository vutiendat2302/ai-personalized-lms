package com.ailms.service;

import com.ailms.request.PermissionRequest;
import com.ailms.request.PermissionSearchRequest;
import com.ailms.response.PermissionResponse;
import org.springframework.data.domain.Page;

import java.util.List;

public interface IPermissionService {

    Page<PermissionResponse> getPermissions(PermissionSearchRequest request);

    // Get all
    List<PermissionResponse> getAllPermissions();
    PermissionResponse getPermissionById(Long id);

    PermissionResponse createPermission(PermissionRequest request);

    PermissionResponse updatePermission(Long id, PermissionRequest request);

    void deletePermission(Long id);
}
