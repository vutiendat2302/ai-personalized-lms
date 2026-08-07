package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.common.util.CodeGenerator;
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

import java.util.*;

import com.ailms.entity.RoleEntity;
import com.ailms.repository.RoleRepository;

@Service
@RequiredArgsConstructor
public class PermissionService implements IPermissionService{

    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;
    private final RolePermissionRepository rolePermissionRepository;
    private final RoleRepository roleRepository;
    private final com.ailms.mapper.RoleMapper roleMapper;
    private final ApplicationEventPublisher applicationEventPublisher;


    private Map<Long, Long> getRoleCountMap() {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] r : rolePermissionRepository.countRolesGroupByPermissionId()) {
            if (r[0] != null && r[1] != null) {
                map.put((Long) r[0], (Long) r[1]);
            }
        }
        return map;
    }

    @Transactional(readOnly = true)
    @Override
    public PageResponse<PermissionResponse> getPermissions(PermissionSearchRequest request) {
        Specification<PermissionEntity> spec = PermissionSpecification.filterAndSearch(request);

        boolean isRoleCountSort = false;
        boolean isAsc = true;
        if (request.getSort() != null) {
            for (String rawSort : request.getSort()) {
                if (rawSort == null) continue;
                for (String s : rawSort.split(",")) {
                    if (s.trim().toLowerCase().startsWith("rolecount")) {
                        isRoleCountSort = true;
                        isAsc = s.toLowerCase().contains("asc");
                        break;
                    }
                }
            }
        }

        if (isRoleCountSort) {
            // Lấy toàn bộ danh sách để sắp xếp toàn cục (Global Sort) theo roleCount trước khi phân trang
            List<PermissionEntity> allEntities = permissionRepository.findAll(spec);
            Map<Long, Long> roleCountMap = getRoleCountMap();

            List<PermissionResponse> allResponses = new ArrayList<>(allEntities.stream().map(entity -> {
                PermissionResponse resp = permissionMapper.toPermissionResponse(entity);
                resp.setRoleCount(roleCountMap.getOrDefault(entity.getId(), 0L));
                return resp;
            }).toList());

            final boolean finalIsAsc = isAsc;
            allResponses.sort((a, b) -> {
                long countA = a.getRoleCount() != null ? a.getRoleCount() : 0L;
                long countB = b.getRoleCount() != null ? b.getRoleCount() : 0L;
                return finalIsAsc ? Long.compare(countA, countB) : Long.compare(countB, countA);
            });

            int totalElements = allResponses.size();
            int pageNumber = (request.getPage() == null || request.getPage() < 0) ? 0 : request.getPage();
            int pageSize = (request.getSize() == null || request.getSize() <= 0) ? 10 : request.getSize();
            int totalPages = (int) Math.ceil((double) totalElements / pageSize);
            if (totalPages == 0) totalPages = 1;

            int fromIndex = Math.min(pageNumber * pageSize, totalElements);
            int toIndex = Math.min(fromIndex + pageSize, totalElements);
            List<PermissionResponse> pageContent = allResponses.subList(fromIndex, toIndex);

            PageResponse<PermissionResponse> response = new PageResponse<>();
            response.setContent(pageContent);
            response.setPageNumber(pageNumber);
            response.setPageSize(pageSize);
            response.setTotalElements(totalElements);
            response.setTotalPages(totalPages);
            response.setFirst(pageNumber == 0);
            response.setLast(pageNumber >= totalPages - 1);
            return response;
        }

        Page<PermissionEntity> page = permissionRepository.findAll(spec, request.toPageable());
        Map<Long, Long> roleCountMap = getRoleCountMap();

        List<PermissionResponse> list = new ArrayList<>(page.getContent().stream().map(entity -> {
            PermissionResponse resp = permissionMapper.toPermissionResponse(entity);
            resp.setRoleCount(roleCountMap.getOrDefault(entity.getId(), 0L));
            return resp;
        }).toList());

        PageResponse<PermissionResponse> response = new PageResponse<>();
        response.setContent(list);
        response.setPageNumber(page.getNumber());
        response.setPageSize(page.getSize());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        response.setFirst(page.isFirst());
        response.setLast(page.isLast());
        return response;
    }

    @Transactional(readOnly = true)
    public PermissionResponse getPermissionById(Long id) {
        PermissionEntity entity = permissionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Permission", id));
        PermissionResponse resp = permissionMapper.toPermissionResponse(entity);
        resp.setRoleCount(rolePermissionRepository.countByPermissionEntity_Id(id));
        return resp;
    }

    @Transactional
    @Override
    public PermissionResponse createPermission(PermissionRequest request) {
        if (permissionRepository.existsByName(request.getName())) {
            throw DuplicateResourceException.of("Permission", "name", request.getName());
        }

        PermissionEntity entity = permissionMapper.toPermissionEntity(request);
        // Sinh mã code bằng CodeGenerator
        String generatedCode = CodeGenerator.generate("PERM", permissionRepository::existsByCode);
        entity.setCode(generatedCode);

        entity = permissionRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "CREATE", "PERMISSION", entity.getId(), null, entity));
        PermissionResponse resp = permissionMapper.toPermissionResponse(entity);
        resp.setRoleCount(0L);
        return resp;
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

        permissionMapper.updatePermissionFromRequest(request, entity);
        entity = permissionRepository.save(entity);
        applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UPDATE", "PERMISSION", id, oldValue, entity));
        PermissionResponse resp = permissionMapper.toPermissionResponse(entity);
        resp.setRoleCount(rolePermissionRepository.countByPermissionEntity_Id(id));
        return resp;
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
        Map<Long, Long> roleCountMap = getRoleCountMap();
        return permissionRepository.findAll().stream().map(entity -> {
            PermissionResponse resp = permissionMapper.toPermissionResponse(entity);
            resp.setRoleCount(roleCountMap.getOrDefault(entity.getId(), 0L));
            return resp;
        }).toList();
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

    @Transactional(readOnly = true)
    @Override
    public List<RoleResponse> getRolesByPermissionId(Long permissionId) {
        List<RolePermissionEntity> rps = rolePermissionRepository.findByPermissionEntity_Id(permissionId);
        return rps.stream()
                .map(rp -> roleMapper.toRoleResponse(rp.getRoleEntity()))
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public long countRolesByPermissionId(Long permissionId) {
        if (!permissionRepository.existsById(permissionId)) {
            throw ResourceNotFoundException.of("Permission", permissionId);
        }
        return rolePermissionRepository.countByPermissionEntity_Id(permissionId);
    }

    @Transactional
    @Override
    public void removeRoleFromPermission(Long permissionId, Long roleId) {
        if (!permissionRepository.existsById(permissionId)) {
            throw ResourceNotFoundException.of("Permission", permissionId);
        }
        List<RolePermissionEntity> rps = rolePermissionRepository.findByPermissionEntity_Id(permissionId);
        RolePermissionEntity target = rps.stream()
                .filter(rp -> rp.getRoleEntity().getId().equals(roleId))
                .findFirst()
                .orElse(null);
        if (target != null) {
            rolePermissionRepository.delete(target);
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "REMOVE_ROLE", "PERMISSION", permissionId, target, null));
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "UNASSIGN_PERMISSION", "ROLE", roleId, "Permission #" + permissionId, null));
        }
    }

    @Transactional
    @Override
    public void assignRoleToPermission(Long permissionId, Long roleId) {
        PermissionEntity permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> ResourceNotFoundException.of("Permission", permissionId));
        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

        boolean exists = rolePermissionRepository.existsByRoleEntity_IdAndPermissionEntity_Id(roleId, permissionId);
        if (!exists) {
            RolePermissionEntity rolePerm = RolePermissionEntity.builder()
                    .permissionEntity(permission)
                    .roleEntity(role)
                    .grantedAt(java.time.LocalDateTime.now())
                    .build();
            rolePermissionRepository.save(rolePerm);
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ASSIGN_ROLE", "PERMISSION", permissionId, null, rolePerm));
            applicationEventPublisher.publishEvent(new AuditLogEvent(this, "ASSIGN_PERMISSION", "ROLE", roleId, null, "Permission #" + permissionId));
        }
    }

    @Transactional
    @Override
    public void bulkDeletePermissions(List<Long> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) return;

        // Check each permission: reject if assigned to any role
        for (Long id : permissionIds) {
            PermissionEntity entity = permissionRepository.findById(id)
                    .orElseThrow(() -> ResourceNotFoundException.of("Permission", id));

            if (rolePermissionRepository.existsByPermissionEntity_Id(id)) {
                throw new BusinessException("Không thể xóa Permission [" + entity.getCode() + "] đang được gán cho Role!");
            }
        }

        // Delete permissions and log audit event
        for (Long id : permissionIds) {
            PermissionEntity entity = permissionRepository.findById(id).orElse(null);
            if (entity != null) {
                permissionRepository.delete(entity);
                applicationEventPublisher.publishEvent(new AuditLogEvent(this, "DELETE", "PERMISSION", id, SimpleJsonWriter.toJson(entity), null));
            }
        }
    }

    @Transactional(readOnly = true)
    @Override
    public com.ailms.response.PermissionMetadataResponse getPermissionMetadata() {
        List<String> entities = permissionRepository.findDistinctEntities();
        List<String> actions = permissionRepository.findDistinctActions();
        return com.ailms.response.PermissionMetadataResponse.builder()
                .entities(entities)
                .actions(actions)
                .build();
    }
}

