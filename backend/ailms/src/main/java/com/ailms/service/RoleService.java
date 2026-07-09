package com.ailms.service;

import com.ailms.entity.PermissionEntity;
import com.ailms.entity.RoleEntity;
import com.ailms.entity.RolePermissionEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.UserRoleEntity;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.RoleMapper;
import com.ailms.mapper.UserMapper;
import com.ailms.repository.PermissionRepository;
import com.ailms.repository.RolePermissionRepository;
import com.ailms.repository.RoleRepository;
import com.ailms.repository.UserRoleRepository;
import com.ailms.repository.specification.RoleSpecification;
import com.ailms.request.AssignPermissionsRequest;
import com.ailms.request.CloneRoleRequest;
import com.ailms.request.RoleRequest;
import com.ailms.response.RoleResponse;
import com.ailms.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserMapper userMapper;

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
        if (roleRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Role", "name", request.getName());
        }
        if (roleRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Role", "code", request.getCode());
        }

        RoleEntity entity = roleMapper.toRoleEntity(request);
        entity = roleRepository.save(entity);
        return roleMapper.toRoleResponse(entity);
    }

    @Transactional
    public RoleResponse updateRole(Long id, RoleRequest request) {
        RoleEntity entity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));

        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw new BusinessException("Cannot update system role");
        }
        if (!entity.getName().equalsIgnoreCase(request.getName()) && roleRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Role", "name", request.getName());
        }
        if (!entity.getCode().equalsIgnoreCase(request.getCode()) && roleRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Role", "code", request.getCode());
        }

        roleMapper.updateRoleFromRequest(request, entity);
        entity = roleRepository.save(entity);
        return roleMapper.toRoleResponse(entity);
    }

    @Transactional
    public void deleteRole(Long id) {
        RoleEntity entity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));
        if (Boolean.TRUE.equals(entity.getIsSystem())) {
            throw new BusinessException("Cannot delete system role");
        }
        if (userRoleRepository.existsByRoleEntity_Id(id)) {
            long count = userRoleRepository.countByRoleEntity_Id(id);
            throw new BusinessException("Role is assigned to " + count + " user(s), please remove it before deleting");
        }
        roleRepository.delete(entity);
    }

    @Transactional
    public RoleResponse cloneRole(Long roleId, CloneRoleRequest request) {
        RoleEntity original = roleRepository.findById(roleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

        if (roleRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Role", "name", request.getName());
        }
        if (roleRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Role", "code", request.getCode());
        }

        RoleEntity newRole = RoleEntity.builder()
                .name(request.getName())
                .code(request.getCode())
                .description(request.getDescription() != null ? request.getDescription() : original.getDescription())
                .isSystem(false)
                .build();

        newRole = roleRepository.save(newRole);

        for (RolePermissionEntity rolePermission : original.getRolePermissions()) {
            RolePermissionEntity newRolePermission = new RolePermissionEntity();
            newRolePermission.setRoleEntity(newRole);
            newRolePermission.setPermissionEntity(rolePermission.getPermissionEntity());
            rolePermissionRepository.save(newRolePermission);
        }

        return roleMapper.toRoleResponse(newRole);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByRoleId(Long roleId) {
        if (!roleRepository.existsById(roleId)) {
            throw ResourceNotFoundException.of("Role", roleId);
        }

        List<UserRoleEntity> userRoles = userRoleRepository.findByRoleEntity_Id(roleId);
        return userRoles.stream()
                .map(this::toUserResponseWithRoles)
                .collect(Collectors.toList());
    }

    @Transactional
    public void assignPermissions(Long roleId, AssignPermissionsRequest request) {
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

        List<RolePermissionEntity> existing = rolePermissionRepository.findByRoleEntity_Id(roleId);
        Set<Long> existingPermissionIds = existing.stream()
                .map(rolePermission -> rolePermission.getPermissionEntity().getId())
                .collect(Collectors.toSet());
        Set<Long> newPermissionIds = new HashSet<>(request.getPermissionIds());

        List<RolePermissionEntity> toRemove = existing.stream()
                .filter(rolePermission -> !newPermissionIds.contains(rolePermission.getPermissionEntity().getId()))
                .collect(Collectors.toList());
        rolePermissionRepository.deleteAll(toRemove);

        for (Long permissionId : newPermissionIds) {
            if (!existingPermissionIds.contains(permissionId)) {
                PermissionEntity permission = permissionRepository.findById(permissionId)
                        .orElseThrow(() -> ResourceNotFoundException.of("Permission", permissionId));

                RolePermissionEntity rolePermission = new RolePermissionEntity();
                rolePermission.setRoleEntity(role);
                rolePermission.setPermissionEntity(permission);
                rolePermissionRepository.save(rolePermission);
            }
        }
    }

    private UserResponse toUserResponseWithRoles(UserRoleEntity userRole) {
        UserEntity user = userRole.getUserEntity();
        UserResponse response = userMapper.toUserResponse(user);
        List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(user.getId());
        response.setRoles(userRoles.stream()
                .map(item -> item.getRoleEntity().getName())
                .collect(Collectors.toList()));
        return response;
    }
}
