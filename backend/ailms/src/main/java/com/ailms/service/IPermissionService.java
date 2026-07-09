package com.ailms.service;

import com.ailms.request.PermissionRequest;
import com.ailms.response.PermissionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface IPermissionService {

    // Page, search, filter
    Page<PermissionResponse> getPermissions(String entityFilter, String actionFilter, String search,
                                                   Pageable pageable);

    // Get all
    List<PermissionResponse> getAllPermissions();
    PermissionResponse getPermissionById(Long id);

    PermissionResponse createPermission(PermissionRequest request);

    PermissionResponse updatePermission(Long id, PermissionRequest request);

    void deletePermission(Long id);
}
