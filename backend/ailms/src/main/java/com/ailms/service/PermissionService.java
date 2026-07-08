package com.ailms.service;

import com.ailms.entity.PermissionEntity;
import com.ailms.mapper.PermissionMapper;
import com.ailms.repository.PermissionRepository;
import com.ailms.repository.specification.PermissionSpecification;
import com.ailms.request.PermissionRequest;
import com.ailms.response.PermissionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;
    private final com.ailms.repository.RolePermissionRepository rolePermissionRepository;

    @Transactional(readOnly = true)
    public Page<PermissionResponse> getPermissions(String entityFilter, String actionFilter, String search, Pageable pageable) {
        Specification<PermissionEntity> spec = PermissionSpecification.filterAndSearch(entityFilter, actionFilter, search);
        return permissionRepository.findAll(spec, pageable).map(permissionMapper::toPermissionResponse);
    }

    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(Long id) {
        PermissionEntity entity = permissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Permission", id));
        return permissionMapper.toPermissionResponse(entity);
    }

    @Transactional
    public PermissionResponse createPermission(PermissionRequest request) {
        if (permissionRepository.findByName(request.getName()).isPresent()) {
            throw DuplicateResourceException.of("Permission", "name", request.getName());
        }
        PermissionEntity entity = permissionMapper.toPermissionEntity(request);
        entity = permissionRepository.save(entity);
        return permissionMapper.toPermissionResponse(entity);
    }

    @Transactional
    public PermissionResponse updatePermission(Long id, PermissionRequest request) {
        PermissionEntity entity = permissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Permission", id));
        
        if (!entity.getName().equals(request.getName()) && permissionRepository.findByName(request.getName()).isPresent()) {
            throw DuplicateResourceException.of("Permission", "name", request.getName());
        }

        permissionMapper.updatePermissionFromRequest(request, entity);
        entity = permissionRepository.save(entity);
        return permissionMapper.toPermissionResponse(entity);
    }

    @Transactional
    public void deletePermission(Long id) {
        if (!permissionRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Permission", id);
        }
        if (rolePermissionRepository.existsByPermissionEntity_Id(id)) {
            long count = rolePermissionRepository.countByPermissionEntity_Id(id);
            throw new com.ailms.exception.BusinessException("Permission đang được gán cho " + count + " role, không thể xóa");
        }
        permissionRepository.deleteById(id);
    }
}
