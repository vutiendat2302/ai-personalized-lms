package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.entity.RolePermissionEntity;
import com.ailms.event.AuditLogEvent;
import com.ailms.response.RoleResponse;
import com.ailms.service.IPermissionService;


import com.ailms.entity.PermissionEntity;
import com.ailms.exception.BusinessException;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.mapper.PermissionMapper;
import com.ailms.repository.PermissionRepository;
import com.ailms.repository.RolePermissionRepository;
import com.ailms.repository.specification.PermissionSpecification;
import com.ailms.request.PermissionRequest;
import com.ailms.request.PermissionSearchRequest;
import com.ailms.response.PermissionResponse;
import lombok.RequiredArgsConstructor;
import com.ailms.response.PageResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PermissionService implements IPermissionService{

    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;
    private final RolePermissionRepository rolePermissionRepository;
    private final com.ailms.mapper.RoleMapper roleMapper;
    private final ApplicationEventPublisher applicationEventPublisher;


    @Transactional(readOnly = true)
    @Override
    public PageResponse<PermissionResponse> getPermissions(PermissionSearchRequest request) {
        Specification<PermissionEntity> spec = PermissionSpecification.filterAndSearch(request);
        Page<PermissionEntity> page = permissionRepository.findAll(spec, request.toPageable());
        return PageResponse.from(page.map(permissionMapper::toPermissionResponse));
    }

    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(Long id) {
        PermissionEntity entity = permissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Permission", id));
        return permissionMapper.toPermissionResponse(entity);
    }

    @Transactional
    @Override
    public PermissionResponse createPermission(PermissionRequest request) {
        if (permissionRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Permission", "name", request.getName());
        }
        if (permissionRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Permission", "code", request.getCode());
        }

        PermissionEntity entity = permissionMapper.toPermissionEntity(request);
        entity = permissionRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "PERMISSION", entity.getId(), null, entity));
        return permissionMapper.toPermissionResponse(entity);
    }

    @Transactional
    @Override
    public PermissionResponse updatePermission(Long id, PermissionRequest request) {
        PermissionEntity entity = permissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Permission", id));
        String oldValue = SimpleJsonWriter.toJson(entity);
        if (!entity.getName().equalsIgnoreCase(request.getName()) && permissionRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Permission", "name", request.getName());
        }
        if (!entity.getCode().equalsIgnoreCase(request.getCode()) && permissionRepository.existsByCode(request.getCode())) {
            throw DuplicateResourceException.of("Permission", "code", request.getCode());
        }

        permissionMapper.updatePermissionFromRequest(request, entity);
        entity = permissionRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "PERMISSION", id, oldValue, entity));
        return permissionMapper.toPermissionResponse(entity);
    }

    @Transactional
    @Override
    public void deletePermission(Long id) {
        PermissionEntity entity = permissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Permission", id));
        String oldValue = SimpleJsonWriter.toJson(entity);
        if (rolePermissionRepository.existsByPermissionEntity_Id(id)) {
            long count = rolePermissionRepository.countByPermissionEntity_Id(id);
            throw new BusinessException("Permission is assigned to " + count + " role(s), cannot delete");
        }
        permissionRepository.delete(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "PERMISSION", id, oldValue, null));
    }

    @Override
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream().map(permissionMapper::toPermissionResponse).toList();
    }

    @Override
    public Map<String, Object> getPermissionOverviewStats() {
        Map<String, Object> map = new HashMap<>();
        map.put("totalPermissions", permissionRepository.count());
        map.put("totalEntities", permissionRepository.countDistinctEntities());
        map.put("orphanPermissions", permissionRepository.countOrphanPermissions());

        // Count by Entity
        Map<String, Long> byEntity = new LinkedHashMap<>();
        for (Object[] r : permissionRepository.countPermissionsByEntity()) {
            byEntity.put((String) r[0], (Long) r[1]);
        }
        map.put("permissionsByEntity", byEntity);

        // Top Used Permissions
        Map<String, Long> topUsed = new LinkedHashMap<>();
        for (Object[] r : permissionRepository.findTopUsedPermissions()) {
            topUsed.put((String) r[0], (Long) r[1]);
        }
        map.put("topUsedPermissions", topUsed);

        // Count by Action
        Map<String, Long> byAction = new LinkedHashMap<>();
        for (Object[] r : permissionRepository.countPermissionsByAction()) {
            byAction.put((String) r[0], (Long) r[1]);
        }
        map.put("permissionsByAction", byAction);

        return map;
    }

    @Override
    public List<RoleResponse> getRolesByPermissionId(Long permissionId) {
        List<RolePermissionEntity> rps = rolePermissionRepository.findByPermissionEntity_Id(permissionId);
        return rps.stream()
                .map(rp -> roleMapper.toRoleResponse(rp.getRoleEntity()))
                .toList();
    }

}

