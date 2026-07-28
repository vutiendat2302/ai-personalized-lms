package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.event.AuditLogEvent;
import com.ailms.service.IRoleService;


import com.ailms.entity.PermissionEntity;
import com.ailms.entity.RoleEntity;
import com.ailms.entity.RolePermissionEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.UserRoleEntity;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.PermissionMapper;
import com.ailms.mapper.RoleMapper;
import com.ailms.mapper.UserMapper;
import com.ailms.repository.PermissionRepository;
import com.ailms.repository.RolePermissionRepository;
import com.ailms.repository.RoleRepository;
import com.ailms.repository.UserRoleRepository;
import com.ailms.repository.specification.RoleSpecification;
import com.ailms.request.AssignPermissionsRequest;
import com.ailms.request.CloneRoleRequest;
import com.ailms.request.PermissionRequest;
import com.ailms.request.RoleRequest;
import com.ailms.request.RoleSearchRequest;
import com.ailms.response.PermissionResponse;
import com.ailms.response.RoleResponse;
import com.ailms.response.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.ailms.response.PageResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleService implements IRoleService {

    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;
    private final PermissionRepository permissionRepository;

    private final RolePermissionRepository rolePermissionRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserMapper userMapper;
    private final PermissionMapper permissionMapper;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Transactional(readOnly = true)
    @Override
    public PageResponse<RoleResponse> getRoles(RoleSearchRequest request) {
        Specification<RoleEntity> spec = RoleSpecification.filterAndSearch(request);
        Page<RoleEntity> page= roleRepository.findAll(spec, request.toPageable());
        return PageResponse.from(page.map(roleMapper::toRoleResponse));
    }

    @Transactional(readOnly = true)
    @Override
    public RoleResponse getRoleById(Long id) {
        RoleEntity roleEntity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));
        return roleMapper.toRoleResponse(roleEntity);
    }

    @Transactional
    @Override
    public RoleResponse createRole(RoleRequest request) {
        if (roleRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Role", "name", request.getName());
        }
        if (roleRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Role", "code", request.getCode());
        }

        RoleEntity roleEntity = roleMapper.toRoleEntity(request);
        roleEntity = roleRepository.save(roleEntity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "ROLE", roleEntity.getId(), null, roleEntity));
        return roleMapper.toRoleResponse(roleEntity);
    }

    @Override
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream().map(roleMapper::toRoleResponse).toList();
    }

    @Override
    public List<PermissionResponse> getPermissionsByRoleId(Long roleId) {
        if (!roleRepository.existsById(roleId)) {
            throw ResourceNotFoundException.of("Role", roleId);
        }
        return permissionRepository.findPermissionsByRoleId(roleId)
                .stream()
                .map(permissionMapper::toPermissionResponse)
                .toList();
    }

    @Transactional
    @Override
    public RoleResponse updateRole(Long id, RoleRequest request) {
        RoleEntity roleEntity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));

        String oldValue = SimpleJsonWriter.toJson(roleEntity);
        if (Boolean.TRUE.equals(roleEntity.getIsSystem())) {
            throw new BusinessException("Cannot update system role");
        }

        if (!roleEntity.getName().equalsIgnoreCase(request.getName()) && roleRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Role", "name", request.getName());
        }
        if (!roleEntity.getCode().equalsIgnoreCase(request.getCode()) && roleRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Role", "code", request.getCode());
        }

        roleMapper.updateRoleFromRequest(request, roleEntity);
        roleEntity = roleRepository.save(roleEntity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "ROLE", id, oldValue, roleEntity));
        return roleMapper.toRoleResponse(roleEntity);
    }

    /**
     * Xóa một Role khỏi hệ thống.
     *
     * <p>Quy trình:
     * <ol>
     *     <li>Kiểm tra Role có tồn tại hay không.</li>
     *     <li>Không cho phép xóa Role hệ thống (isSystem = true).</li>
     *     <li>Kiểm tra Role có đang được gán cho User nào không.</li>
     *     <li>Nếu còn User sử dụng, từ chối xóa và trả về số lượng User đang sử dụng Role đó.</li>
     *     <li>Nếu hợp lệ, thực hiện xóa Role khỏi cơ sở dữ liệu.</li>
     * </ol>
     * </p>
     *
     * @param id ID của Role cần xóa.
     * @throws ResourceNotFoundException nếu Role không tồn tại.
     * @throws BusinessException nếu Role là Role hệ thống hoặc đang được gán cho User.
     */
    @Transactional
    @Override
    public void deleteRole(Long id) {
        RoleEntity roleEntity = roleRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", id));
        String oldValue = SimpleJsonWriter.toJson(roleEntity);
        if (Boolean.TRUE.equals(roleEntity.getIsSystem())) {
            throw new BusinessException("Cannot delete system role");
        }
        if (userRoleRepository.existsByRoleEntity_Id(id)) {
            long count = userRoleRepository.countByRoleEntity_Id(id);
            throw new BusinessException("Role is assigned to " + count + " user(s), please remove it before deleting");
        }
        roleRepository.delete(roleEntity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "ROLE", id, oldValue, null));
    }

    @Transactional(readOnly = true)
    @Override
    public List<UserResponse> getUsersByRoleId(Long roleId) {
        if (!roleRepository.existsById(roleId)) {
            throw ResourceNotFoundException.of("Role", roleId);
        }

        List<UserRoleEntity> userRoles = userRoleRepository.findByRoleEntity_Id(roleId);
        return userRoles.stream()
                .map(this::toUserResponseWithRoles)
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật danh sách Permission của Role.
     * Thực hiện đồng bộ toàn bộ Permission:
     * - Xóa các Permission không còn trong danh sách mới.
     * - Thêm các Permission mới chưa được gán.
     * - Giữ nguyên các Permission đã tồn tại.
     */
    @Transactional
    public void assignPermissions(Long roleId, AssignPermissionsRequest request) {
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

        Set<Long> newPermissionIds = new HashSet<>(request.getPermissionIds());

        // neu newPr rong, xoa het permission khoi role
        if (newPermissionIds.isEmpty()) {
            rolePermissionRepository.deleteByRoleEntity_Id(roleId);
            return;
        }

        // Xóa các permission không còn trong danh sách mới
        rolePermissionRepository.deletePermissionsNotIn(roleId, request.getPermissionIds());

        // Lấy các permission hiện còn của role sau khi đồng bộ
        Set<Long> existingPermissionIds = rolePermissionRepository.findByRoleEntity_Id(roleId).stream()
                .map(rp -> rp.getPermissionEntity().getId())
                .collect(Collectors.toSet());

        // Xac dinh cac permission moi
        List<Long> permissionIdsToAdd = newPermissionIds.stream()
                .filter(permissionId -> !existingPermissionIds.contains(permissionId))
                .toList();

        // Lay ra thong tin cac permission moi
        List<PermissionEntity> permissionsToAdd =
                permissionRepository.findAllById(permissionIdsToAdd);

        // Kiem tra xem cac permission co ton tai khong
        if (permissionsToAdd.size() != permissionIdsToAdd.size()) {
            throw ResourceNotFoundException.of("Permission not fun");
        }

        List<RolePermissionEntity> newRolePermissions =
                permissionsToAdd.stream()
                        .map(permission -> buildRolePermission(role, permission))
                        .toList();

        rolePermissionRepository.saveAll(newRolePermissions);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "ROLE_PERMISSION", roleId, null, null));
    }

    private RolePermissionEntity buildRolePermission(RoleEntity role, PermissionEntity permission) {
            RolePermissionEntity rolePermission = new RolePermissionEntity();
            rolePermission.setRoleEntity(role);
            rolePermission.setPermissionEntity(permission);
            rolePermission.setGrantedAt(LocalDateTime.now());
            return rolePermission;
        }

    private UserResponse toUserResponseWithRoles(UserRoleEntity userRole) {
        UserEntity user = userRole.getUserEntity();
        UserResponse response = userMapper.toUserResponse(user);
        List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(user.getId());
        response.setRoles(userRoles.stream()
                .map(item -> item.getRoleEntity().getCode())
                .collect(Collectors.toList()));
        return response;
    }


    @Transactional
    @Override
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

    @Transactional
    @Override
    public PermissionResponse createAndAssignPermission(Long roleId, PermissionRequest request) {
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

        if (permissionRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Permission", "code", request.getCode());
        }

        PermissionEntity permission = permissionMapper.toPermissionEntity(request);
        permission = permissionRepository.save(permission);

        RolePermissionEntity rolePermission = buildRolePermission(role, permission);
        rolePermissionRepository.save(rolePermission);

        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE_AND_ASSIGN_PERMISSION", "ROLE", roleId, null, null));
        return permissionMapper.toPermissionResponse(permission);
    }

    @Override
    public java.util.Map<String, Object> getRoleOverviewStats() {
        log.info("Getting role overview stats");
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("totalRoles", roleRepository.count());
        map.put("systemRoles", roleRepository.countSystemRoles());
        map.put("customRoles", roleRepository.countCustomRoles());
        map.put("unusedRoles", roleRepository.countUnusedRoles());
        map.put("emptyRoles", roleRepository.countEmptyRoles());
        return map;
    }

    @Override
    public java.util.Map<String, Long> getRolePermissionsDistribution() {
        log.info("Getting role permissions distribution");
        java.util.Map<String, Long> map = new java.util.LinkedHashMap<>();
        List<Object[]> rows = roleRepository.countPermissionsByRole();
        for (Object[] r : rows) {
            String roleName = (String) r[0];
            Long count = (Long) r[1];
            map.put(roleName, count);
        }
        return map;
    }

    @Transactional
    @Override
    public void removeUserFromRole(Long roleId, Long userId) {
        log.info("Removing user {} from role {}", userId, roleId);
        List<UserRoleEntity> userRoles = userRoleRepository.findByRoleEntity_Id(roleId);
        for (UserRoleEntity ur : userRoles) {
            if (ur.getUserEntity().getId().equals(userId)) {
                userRoleRepository.delete(ur);
            }
        }
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "REMOVE_USER_ROLE", "USER_ROLE", roleId, null, userId));
    }

    @Transactional
    @Override
    public void bulkDeleteCustomRoles(List<Long> roleIds) {
        log.info("Bulk deleting custom unused roles: {}", roleIds);
        for (Long id : roleIds) {
            RoleEntity role = roleRepository.findById(id).orElse(null);
            if (role != null && Boolean.FALSE.equals(role.getIsSystem())) {
                if (!userRoleRepository.existsByRoleEntity_Id(id)) {
                    roleRepository.delete(role);
                }
            }
        }
    }
}
