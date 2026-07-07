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
import com.ailms.request.UpdateProfileRequest;
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
    private final IEmailService emailService;
    private final org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate;

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

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getGender() != null) user.setGender(request.getGender());
        if (request.getDateOfBirth() != null) user.setDateOfBirth(request.getDateOfBirth().atStartOfDay());

        userRepository.save(user);

        UserResponse response = userMapper.toUserResponse(user);
        List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(user.getId());
        response.setRoles(userRoles.stream().map(ur -> ur.getRoleEntity().getName()).collect(Collectors.toList()));
        return response;
    }

    @Transactional
    public void verifyEmailChange(Long userId, com.ailms.request.VerifyEmailChangeRequest request) {
        String redisKey = "otp:change_email:" + userId;
        String storedValue = redisTemplate.opsForValue().get(redisKey);

        if (storedValue == null) {
            throw new RuntimeException("Mã OTP không hợp lệ hoặc đã hết hạn.");
        }

        String[] parts = storedValue.split(":");
        String storedOtp = parts[0];
        String newEmail = parts[1];

        if (!storedOtp.equals(request.getOtp())) {
            throw new RuntimeException("Mã OTP không chính xác.");
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        
        user.setEmail(newEmail);
        userRepository.save(user);

        redisTemplate.delete(redisKey);
    }
}
