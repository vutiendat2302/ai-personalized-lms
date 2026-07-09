package com.ailms.service;

import com.ailms.entity.*;
import com.ailms.mapper.UserMapper;
import com.ailms.mapper.AuditLogMapper;
import com.ailms.repository.*;
import com.ailms.repository.specification.UserSpecification;
import com.ailms.repository.specification.AuditLogSpecification;
import com.ailms.request.*;
import com.ailms.response.CategoryResponse;
import com.ailms.response.UserResponse;
import com.ailms.response.AuditLogResponse;
import com.ailms.response.EffectivePermissionResponse;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.BusinessException;
import com.ailms.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.parameters.P;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.ailms.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements IUserService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserMapper userMapper;
    private final AuditLogMapper auditLogMapper;
    private final IEmailService emailService;
    private final RedisTemplate<String, String> redisTemplate;
    private final PasswordEncoder passwordEncoder;
    private final IAuditLogService auditLogService;
    private final JwtUtils jwtUtils;

    @Transactional(readOnly = true)
    @Override
    public Page<UserResponse> getUsers(UserSearchRequest request) {
        Specification<UserEntity> spec = UserSpecification.filterAndSearch(request);
        return userRepository.findAll(spec, request.toPageable()).map(this::mapToUserResponse);
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .toList();
    }

    @Override
    public UserResponse getUserById(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        return mapToUserResponse(user);
    }

    /**
     * Admin, hr tao tai khoan cho user
     * @param request
     * @return
     */
    @Transactional
    @Override
    public UserResponse createUser(CreateUserRequest request) {
        validateUniqueUsernameAndEmail(request.getUsername(), request.getEmail());
        UserEntity user = userMapper.toUserEntity(request);
        Long adminId = getCurrentUserId();
        user.setCreatedBy(adminId);

        boolean hasPassword = request.getPassword() != null && !request.getPassword().isBlank();
        if (hasPassword) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            user.setStatus(request.getStatus() != null ? request.getStatus() : UserStatusEntity.ACTIVE);
        } else {
            user.setPasswordHash(passwordEncoder.encode("A" + UUID.randomUUID().toString()));
            user.setStatus(UserStatusEntity.PENDING_VERIFICATION);
        }

        user = userRepository.save(user);

        assignRolesToUser(user, request.getRoleIds(), adminId);

        if (!hasPassword) {
            String token = jwtUtils.generateSetPasswordToken(user.getId());
            emailService.sendInviteEmail(user.getEmail(), token);
        }

        auditLogService.log("create_user", "user", adminId, null, user);

        return mapToUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        UserEntity oldUser = userMapper.cloneUser(user);
        userMapper.updateUserProfile(user, request);
        user = userRepository.save(user);

        auditLogService.log("update_profile", "user", userId, oldUser, user);
        return mapToUserResponse(user);
    }


    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        userMapper.updateUserEntity(user, request);
        user = userRepository.save(user);

        // Log audit
        auditLogService.log("update_user", "user", id, null, user);
        return mapToUserResponse(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        if (user.getStatus() == UserStatusEntity.DELETED) {
            return;
        }

        UserEntity oldState = userMapper.cloneUser(user);

        user.setStatus(UserStatusEntity.DELETED);
        userRepository.save(user);

        // Invalidate token / revoke session
        redisTemplate.opsForValue().set("invalidate:token:user:" + id, String.valueOf(System.currentTimeMillis()));

        auditLogService.log("delete_user", "user", id, oldState, user);
    }

    /**
     * Gửi lời mời tạo tài khoản cho người dùng.
     *
     * Quy trình:
     * 1. Kiểm tra email đã tồn tại trong hệ thống hay chưa.
     * 2. Nếu chưa tồn tại thì tạo tài khoản ở trạng thái INACTIVE.
     * 3. Xóa lời mời cũ (nếu có) để chỉ tồn tại một token hợp lệ.
     * 4. Tạo Invite Token mới và lưu các Role sẽ được gán.
     * 5. Gửi email chứa liên kết kích hoạt tài khoản.
     * 6. Ghi Audit Log.
     */
    @Transactional
    public void inviteUser(InviteUserRequest request) {
        Optional<UserEntity> existingUserOpt = userRepository.findByEmail(request.getEmail());
        UserEntity user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            if (user.getStatus() != UserStatusEntity.INACTIVE
                    && user.getStatus() != UserStatusEntity.PENDING_VERIFICATION) {
                throw new BusinessException("User account is already active or locked.");
            }
        } else {
            user = new UserEntity();
            user.setUsername(request.getEmail());

            user.setEmail(request.getEmail());
            user.setStatus(UserStatusEntity.INACTIVE);
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            user = userRepository.save(user);
        }

        // Vô hiệu hoá token cũ của email này nếu có trong Redis
        String emailKey = "invite:email:" + request.getEmail();
        String oldToken = redisTemplate.opsForValue().get(emailKey);
        if (oldToken != null) {
            redisTemplate.delete("invite:token:" + oldToken);
        }

        String token = UUID.randomUUID().toString();
        String tokenKey = "invite:token:" + token;

        String roleIdsStr = "";
        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            roleIdsStr = request.getRoleIds().stream().map(Object::toString).collect(Collectors.joining(","));
        }

        String value = request.getEmail() + "|" + roleIdsStr;
        redisTemplate.opsForValue().set(tokenKey, value, Duration.ofHours(24));
        redisTemplate.opsForValue().set(emailKey, token, Duration.ofHours(24));

        // Send Email invite link
        String inviteLink = "http://localhost:8080/set-password?token=" + token;
        emailService.sendInviteEmail(request.getEmail(), inviteLink);

        auditLogService.log("user_invited", "user", user.getId(), null, user);
    }

    /**
     * Hoàn tất quá trình kích hoạt tài khoản từ lời mời.
     *
     * Quy trình:
     * 1. Kiểm tra token có hợp lệ và còn hiệu lực.
     * 2. Thiết lập mật khẩu cho người dùng.
     * 3. Kích hoạt tài khoản.
     * 4. Gán các Role đã được lưu trong lời mời.
     * 5. Đánh dấu token đã sử dụng.
     * 6. Ghi Audit Log.
     */
    @Transactional
    public void completeInvite(CompleteInviteRequest request) {
        String tokenKey = "invite:token:" + request.getToken();
        String storedValue = redisTemplate.opsForValue().get(tokenKey);

        if (storedValue == null) {
            throw new BusinessException("Mã lời mời không hợp lệ hoặc đã hết hạn.");
        }

        String[] parts = storedValue.split("\\|", 2);
        String email = parts[0];
        String roleIds = parts.length > 1 ? parts[1] : "";

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatusEntity.ACTIVE);
        userRepository.save(user);

        // Assign Roles
        if (!roleIds.isBlank()) {
            List<UserRoleEntity> existingRoles = userRoleRepository.findByUserEntity_Id(user.getId());
            userRoleRepository.deleteAll(existingRoles);

            String[] roleIdsStr = roleIds.split(",");
            Long currentAdminId = getCurrentUserId();
            for (String rId : roleIdsStr) {
                Long roleId = Long.parseLong(rId.trim());
                RoleEntity role = roleRepository.findById(roleId)
                        .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

                UserRoleEntity ur = new UserRoleEntity();
                ur.setUserEntity(user);
                ur.setRoleEntity(role);
                ur.setAssignedBy(currentAdminId);
                ur.setAssigned_at(LocalDateTime.now());
                userRoleRepository.save(ur);
            }
        }

        // Xóa token trong Redis
        redisTemplate.delete(tokenKey);
        redisTemplate.delete("invite:email:" + email);

        auditLogService.log("user_activated", "user", user.getId(), null, user);
    }

    /**
     * Xóa mềm nhiều người dùng cùng lúc.
     *
     * Với mỗi người dùng:
     * - Kiểm tra tồn tại.
     * - Chuyển trạng thái sang DELETED.
     * - Vô hiệu hóa phiên đăng nhập.
     * - Ghi Audit Log.
     *
     * Trả về số lượng thành công, thất bại và danh sách lỗi.
     */
    @Transactional
    public Map<String, Object> bulkDelete(BulkDeleteRequest request) {
        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new ArrayList<>();

        for (Long userId : request.getUserIds()) {
            Optional<UserEntity> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                failureCount++;
                errors.add("User ID " + userId + ": User not found");
                continue;
            }

            UserEntity user = userOpt.get();
            if (user.getStatus() == UserStatusEntity.DELETED) {
                successCount++;
                continue;
            }

            try {
                UserEntity oldState = userMapper.cloneUser(user);
                user.setStatus(UserStatusEntity.DELETED);
                userRepository.save(user);

                redisTemplate.opsForValue().set("invalidate:token:user:" + userId,
                        String.valueOf(System.currentTimeMillis()));
                auditLogService.log("delete_user", "user", userId, oldState, user);

                successCount++;
            } catch (Exception e) {
                failureCount++;
                errors.add("User ID " + userId + ": " + e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("errors", errors);
        return result;
    }

    /**
     * Gán một Role cho nhiều người dùng.
     *
     * Chỉ gán nếu người dùng chưa có Role đó.
     * Trả về kết quả thành công, thất bại và danh sách lỗi.
     */
    @Transactional
    public Map<String, Object> bulkAssignRole(BulkAssignRoleRequest request) {
        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new ArrayList<>();

        RoleEntity role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> ResourceNotFoundException.of("Role", request.getRoleId()));

        Long currentAdminId = getCurrentUserId();

        for (Long userId : request.getUserIds()) {
            Optional<UserEntity> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                failureCount++;
                errors.add("User ID " + userId + ": User not found");
                continue;
            }

            UserEntity user = userOpt.get();
            try {
                boolean alreadyHasRole = userRoleRepository.findByUserEntity_Id(userId).stream()
                        .anyMatch(ur -> ur.getRoleEntity().getId().equals(request.getRoleId()));

                if (!alreadyHasRole) {
                    UserRoleEntity ur = new UserRoleEntity();
                    ur.setUserEntity(user);
                    ur.setRoleEntity(role);
                    ur.setAssignedBy(currentAdminId);
                    ur.setAssigned_at(LocalDateTime.now());
                    userRoleRepository.save(ur);

                    auditLogService.log("grant_role", "user", userId, null, "Granted role " + role.getName());
                }
                successCount++;
            } catch (Exception e) {
                failureCount++;
                errors.add("User ID " + userId + ": " + e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("errors", errors);
        return result;
    }

    /**
     * Lấy danh sách Audit Log theo các điều kiện lọc.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(
            String entityType,
            Long entityId,
            String action,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable) {
        Specification<AuditLogEntity> spec = AuditLogSpecification.filterLogs(entityType, entityId, action, start, end);
        return auditLogRepository.findAll(spec, pageable).map(auditLogMapper::toResponse);
    }

    /**
     * Lấy toàn bộ Permission có hiệu lực của người dùng.
     *
     * Permission được tổng hợp từ tất cả Role còn hiệu lực.
     * Nếu nhiều Role chứa cùng Permission thì chỉ trả về một lần.
     */
    @Transactional(readOnly = true)
    public List<EffectivePermissionResponse> getEffectivePermissions(Long userId) {
        List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(userId);
        LocalDateTime now = LocalDateTime.now();

        // Filter valid non-expired user roles
        List<UserRoleEntity> activeUserRoles = userRoles.stream()
                .filter(ur -> ur.getExpired_at() == null || ur.getExpired_at().isAfter(now))
                .collect(Collectors.toList());

        Map<Long, EffectivePermissionResponse> permMap = new HashMap<>();

        for (UserRoleEntity ur : activeUserRoles) {
            RoleEntity role = ur.getRoleEntity();
            for (RolePermissionEntity rp : role.getRolePermissions()) {
                PermissionEntity perm = rp.getPermissionEntity();
                EffectivePermissionResponse resp = permMap.computeIfAbsent(perm.getId(), k -> {
                    EffectivePermissionResponse r = new EffectivePermissionResponse();
                    r.setPermissionId(perm.getId());
                    r.setPermissionName(perm.getName());
                    r.setPermissionCode(perm.getCode());
                    r.setEntity(perm.getEntity());
                    r.setAction(perm.getAction());
                    r.setDescription(perm.getDescription());
                    r.setSourceRoles(new ArrayList<>());
                    return r;
                });
                if (!resp.getSourceRoles().contains(role.getName())) {
                    resp.getSourceRoles().add(role.getName());
                }
            }
        }

        return new ArrayList<>(permMap.values());
    }

    /**
     * Gán lại danh sách Role cho người dùng.
     * Toàn bộ Role hiện tại sẽ được thay thế bằng danh sách mới.
     */
    @Transactional
    public void assignRoles(Long userId, AssignRolesRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        if (request.getRoleIds() == null || request.getRoleIds().isEmpty()) {
            throw new BusinessException("User must have at least one role");
        }

        List<UserRoleEntity> existing = userRoleRepository.findByUserEntity_Id(userId);
        userRoleRepository.deleteAll(existing);

        Long currentAdminId = getCurrentUserId();
        for (Long roleId : request.getRoleIds()) {
            RoleEntity role = roleRepository.findById(roleId)
                    .orElseThrow(() -> ResourceNotFoundException.of("Role", roleId));

            UserRoleEntity ur = new UserRoleEntity();
            ur.setUserEntity(user);
            ur.setRoleEntity(role);
            ur.setAssignedBy(currentAdminId);
            ur.setAssigned_at(LocalDateTime.now());
            userRoleRepository.save(ur);
        }

        auditLogService.log("assign_roles", "user", userId, null, request.getRoleIds());
    }

    private void assignRolesToUser(UserEntity user, List<Long> roleIds, Long adminId) {
        if (roleIds == null || roleIds.isEmpty()) {
            return;
        }
        List<RoleEntity> roles = roleRepository.findAllById(roleIds);
        if (roles.size() != roleIds.size()) {
            throw ResourceNotFoundException.of("Role");
        }

        List<UserRoleEntity> userRoles = roles.stream()
                .map(role -> buildUserRole(user, role, adminId))
                .toList();

        userRoleRepository.saveAll(userRoles);

    }

    private UserRoleEntity buildUserRole(UserEntity user, RoleEntity role, Long adminId) {
        return UserRoleEntity.builder()
                .userEntity(user)
                .roleEntity(role)
                .assignedBy(adminId)
                .assigned_at(LocalDateTime.now())
                .build();
    }

    /**
     * Xác thực thay đổi địa chỉ email bằng mã OTP.
     * Sau khi xác thực thành công:
     * - Cập nhật email mới.
     * - Xóa OTP khỏi Redis.
     * - Ghi Audit Log.
     */
    @Transactional
    public void verifyEmailChange(Long userId, VerifyEmailChangeRequest request) {
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

        UserEntity oldState = userMapper.cloneUser(user);

        user.setEmail(newEmail);
        userRepository.save(user);
        redisTemplate.delete(redisKey);
        auditLogService.log("verify_email_change", "user", userId, oldState, user);
    }

    /**
     * Kiểm tra Username và Email chưa tồn tại trong hệ thống.
     * Ném DuplicateResourceException nếu phát hiện dữ liệu trùng.
     */
    private void validateUniqueUsernameAndEmail(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw DuplicateResourceException.of("User", "username", username);
        }
        if (userRepository.existsByEmail(email)) {
            throw DuplicateResourceException.of("User", "email", email);
        }
    }

    // map entity -> response va lay role còn hiệu lực của user
    private UserResponse mapToUserResponse(UserEntity user) {
        log.info("map entity");
        UserResponse response = userMapper.toUserResponse(user);
        List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(user.getId());
        response.setRoles(userRoles.stream()
                .filter(ur -> ur.getExpired_at() == null || ur.getExpired_at().isAfter(LocalDateTime.now()))
                .map(ur -> ur.getRoleEntity().getName())
                .collect(Collectors.toList()));
        return response;
    }

    // lay id của user đang đăng nhập
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof AnonymousAuthenticationToken)) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                return userDetails.getUser().getId();
            }
        }
        return null;
    }

}
