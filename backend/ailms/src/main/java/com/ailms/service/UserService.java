package com.ailms.service;

import com.ailms.entity.RoleEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.UserRoleEntity;
import com.ailms.mapper.UserMapper;
import com.ailms.repository.RoleRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.UserRoleRepository;
import com.ailms.repository.specification.UserSpecification;
import com.ailms.request.AssignRolesRequest;
import com.ailms.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ailms.exception.ResourceNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public Page<UserResponse> getUsers(Integer status, String search, Pageable pageable) {
        Specification<UserEntity> spec = UserSpecification.filterAndSearch(status, search);
        return userRepository.findAll(spec, pageable).map(user -> {
            UserResponse response = userMapper.toUserResponse(user);
            List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(user.getId());
            response.setRoles(userRoles.stream().map(ur -> ur.getRoleEntity().getName()).collect(Collectors.toList()));
            return response;
        });
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
        UserResponse response = userMapper.toUserResponse(user);
        List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(user.getId());
        response.setRoles(userRoles.stream().map(ur -> ur.getRoleEntity().getName()).collect(Collectors.toList()));
        return response;
    }

    @Transactional
    public void assignRoles(Long userId, AssignRolesRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        // Clear existing roles
        List<UserRoleEntity> existing = userRoleRepository.findByUserEntity_Id(userId);
        userRoleRepository.deleteAll(existing);

        // Assign new roles
        for (Long roleId : request.getRoleIds()) {
            RoleEntity role = roleRepository.findById(roleId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));
            
            UserRoleEntity ur = new UserRoleEntity();
            ur.setUserEntity(user);
            ur.setRoleEntity(role);
            userRoleRepository.save(ur);
        }
    }
}
