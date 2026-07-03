package com.ailms.service;

import com.ailms.entity.PermissionEntity;
import com.ailms.entity.RoleEntity;
import com.ailms.entity.RolePermissionEntity;
import com.ailms.mapper.RoleMapper;
import com.ailms.repository.PermissionRepository;
import com.ailms.repository.RolePermissionRepository;
import com.ailms.repository.RoleRepository;
import com.ailms.repository.specification.RoleSpecification;
import com.ailms.request.AssignPermissionsRequest;
import com.ailms.request.RoleRequest;
import com.ailms.response.RoleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.BusinessException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Transactional(readOnly = true)
    public Page<RoleResponse> getRoles(Boolean isSystem, String search, Pageable pageable) {
        Specification<RoleEntity> spec = RoleSpecification.filterAndSearch(isSystem, search);
        return roleRepository.findAll(spec, pageable).map(roleMapper::toRoleResponse);
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long id) {
        RoleEntity entity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));
        return roleMapper.toRoleResponse(entity);
    }

    @Transactional
    public RoleResponse createRole(RoleRequest request) {
        if (roleRepository.findByName(request.getName()).isPresent()) {
            throw DuplicateResourceException.of("Role", "name", request.getName());
        }
        RoleEntity entity = roleMapper.toRoleEntity(request);
        entity = roleRepository.save(entity);
        return roleMapper.toRoleResponse(entity);
    }

    @Transactional
    public RoleResponse updateRole(Long id, RoleRequest request) {
        RoleEntity entity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));
        
        if (entity.getIsSystem()) {
            throw new BusinessException("Cannot update system role");
        }

        if (!entity.getName().equals(request.getName()) && roleRepository.findByName(request.getName()).isPresent()) {
            throw DuplicateResourceException.of("Role", "name", request.getName());
        }

        roleMapper.updateRoleFromRequest(request, entity);
        entity = roleRepository.save(entity);
        return roleMapper.toRoleResponse(entity);
    }

    @Transactional
    public void deleteRole(Long id) {
        RoleEntity entity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));
        if (entity.getIsSystem()) {
            throw new BusinessException("Cannot delete system role");
        }
        roleRepository.delete(entity);
    }

    @Transactional
    public void assignPermissions(Long roleId, AssignPermissionsRequest request) {
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

        // Clear existing permissions
        List<RolePermissionEntity> existing = rolePermissionRepository.findByRoleEntity_Id(roleId);
        rolePermissionRepository.deleteAll(existing);

        // Add new permissions
        for (Long permId : request.getPermissionIds()) {
            PermissionEntity permission = permissionRepository.findById(permId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Permission", permId));
            
            RolePermissionEntity rp = new RolePermissionEntity();
            rp.setRoleEntity(role);
            rp.setPermissionEntity(permission);
            rolePermissionRepository.save(rp);
        }
    }
}
