package com.ailms.service.imp;
import com.ailms.common.util.CsvExport;
import com.ailms.event.AuditLogEvent;
import com.ailms.service.IEmailService;
import com.ailms.service.IUserService;
import com.ailms.service.IStudentProfileService;
import com.ailms.service.IEmployeeService;
import org.springframework.context.ApplicationEventPublisher;


import com.ailms.entity.*;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.mapper.UserMapper;
import com.ailms.mapper.GuardianMapper;
import com.ailms.repository.*;
import com.ailms.repository.specification.UserSpecification;
import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.BusinessException;
import com.ailms.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.ailms.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements IUserService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final UserMapper userMapper;
    private final IEmailService emailService;
    private final RedisTemplate<String, String> redisTemplate;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    private final JwtUtils jwtUtils;
    private final IStudentProfileService studentProfileService;
    private final IEmployeeService employeeService;
    private final GuardianRepository guardianRepository;
    private final GuardianMapper guardianMapper;
    private final EmployeeRepository employeeRepository;

    @Value("${app.frontend.set-password}/api/auth/set-password")
    private String frontendUrl;


    @Transactional(readOnly = true)
    @Override
    public PageResponse<UserResponse> getUsers(UserSearchRequest request) {
        Specification<UserEntity> spec = UserSpecification.filterAndSearch(request);
        Page<UserEntity> page = userRepository.findAll(spec, request.toPageable());
        return PageResponse.from(page.map(this::mapToUserResponse));
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
     */
    @Transactional
    @Override
//    @PreAuthorize("hasAuthority('USER_CREATE')")
    public UserResponse createUser(CreateUserRequest request) {
        validateUniqueUsernameAndEmail(request.getUsername(), request.getEmail());
        UserEntity user = userMapper.toUserEntity(request);
        Long adminId = getCurrentUserId();
        user.setCreatedBy(adminId);

        boolean hasPassword = request.getPassword() != null && !request.getPassword().isBlank();
        if (hasPassword) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            user.setStatus(request.getStatus() != null ? request.getStatus() : UserStatusEnum.ACTIVE);
        } else {
            user.setPasswordHash(passwordEncoder.encode("A" + UUID.randomUUID()));
            user.setStatus(UserStatusEnum.VERIFICATION);
        }

        user = userRepository.save(user);

        assignRolesToUser(user, request.getRoleIds(), adminId);

        if (!hasPassword) {
            String token = jwtUtils.generateSetPasswordToken(user.getId());
            log.info("Invite JWT Token = {}", token);
            emailService.sendInviteEmail(user.getEmail(), token);
        }

        eventPublisher.publishEvent(new AuditLogEvent(this, "create_user", "user", adminId, null, user));

        return mapToUserResponse(user);
    }

    @Transactional
    @Override
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        UserEntity oldUser = userMapper.cloneUser(user);
        userMapper.updateUserProfile(user, request);
        user = userRepository.save(user);

        eventPublisher.publishEvent(new AuditLogEvent(this, "update_profile", "user", userId, oldUser, user));
        return mapToUserResponse(user);
    }


    @Transactional
    @Override
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        userMapper.updateUserEntity(user, request);
        user = userRepository.save(user);

        // Log audit
        eventPublisher.publishEvent(new AuditLogEvent(this, "update_user", "user", id, null, user));
        return mapToUserResponse(user);
    }

    @Transactional
    @Override
    public void deleteUser(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        if (user.getStatus() == UserStatusEnum.DELETED) {
            return;
        }

        UserEntity oldState = userMapper.cloneUser(user);

        user.setStatus(UserStatusEnum.DELETED);
        userRepository.save(user);

        // Invalidate token / revoke session
        redisTemplate.opsForValue().set("invalidate:token:user:" + id, String.valueOf(System.currentTimeMillis()));

        eventPublisher.publishEvent(new AuditLogEvent(this, "delete_user", "user", id, oldState, user));
    }

    /**
     * Gửi lời mời tạo tài khoản cho người dùng.
     * Quy trình:
     * 1. Kiểm tra email đã tồn tại trong hệ thống hay chưa.
     * 2. Nếu chưa tồn tại thì tạo tài khoản ở trạng thái INACTIVE.
     * 3. Xóa lời mời cũ (nếu có) để chỉ tồn tại một token hợp lệ.
     * 4. Tạo Invite Token mới và lưu các Role sẽ được gán.
     * 5. Gửi email chứa liên kết kích hoạt tài khoản.
     * 6. Ghi Audit Log.
     */
    @Transactional
    @Override
    public void inviteUser(InviteUserRequest request) {
        Optional<UserEntity> existingUserOpt = userRepository.findByEmail(request.getEmail());
        UserEntity user;
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            if (user.getStatus() != UserStatusEnum.VERIFICATION) {
                throw new BusinessException("User account is already active or locked.");
            }
        } else {
            log.info("Create User");
            user = new UserEntity();
            user.setUsername(request.getEmail());

            user.setEmail(request.getEmail());
            user.setStatus(UserStatusEnum.VERIFICATION);
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            log.info("Luu User");
            user = userRepository.save(user);
        }

        String token = jwtUtils.generateSetPasswordToken(user.getId());
        log.info("Invite token = {}", token);

        log.info("send Invite");
        // Send Email invite link
        String inviteLink = frontendUrl + "/set-password?token=" + token;
        emailService.sendInviteEmail(request.getEmail(), inviteLink);

        log.info("Audit log");
        eventPublisher.publishEvent(new AuditLogEvent(this, "user_invited", "user", user.getId(), null, user));
    }

    /**
     * Hoàn tất quá trình kích hoạt tài khoản từ lời mời.
     * Quy trình:
     * 1. Kiểm tra token có hợp lệ và còn hiệu lực.
     * 2. Thiết lập mật khẩu cho người dùng.
     * 3. Kích hoạt tài khoản.
     * 4. Gán các Role đã được lưu trong lời mời.
     * 5. Đánh dấu token đã sử dụng.
     * 6. Ghi Audit Log.
     */
    @Transactional
    @Override
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
        user.setStatus(UserStatusEnum.ACTIVE);
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
                ur.setAssignedAt(LocalDateTime.now());
                userRoleRepository.save(ur);
            }
        }

        // Xóa token trong Redis
        redisTemplate.delete(tokenKey);
        redisTemplate.delete("invite:email:" + email);

        eventPublisher.publishEvent(new AuditLogEvent(this, "user_activated", "user", user.getId(), null, user));
    }

    /**
     * Xóa mềm nhiều người dùng cùng lúc.
     * Với mỗi người dùng:
     * - Kiểm tra tồn tại.
     * - Chuyển trạng thái sang DELETED.
     * - Vô hiệu hóa phiên đăng nhập.
     * - Ghi Audit Log.
     * Trả về số lượng thành công, thất bại và danh sách lỗi.
     */
    @Transactional
    @Override
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
            if (user.getStatus() == UserStatusEnum.DELETED) {
                successCount++;
                continue;
            }
            Long adminId = getCurrentUserId();

            try {
                UserEntity oldState = userMapper.cloneUser(user);
                user.setStatus(UserStatusEnum.DELETED);
                userRepository.save(user);

                redisTemplate.opsForValue().set("invalidate:token:user:" + userId,
                        String.valueOf(System.currentTimeMillis()));
                eventPublisher.publishEvent(new AuditLogEvent(this, "delete_user", "user", adminId, oldState, user));

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
     * Gán một role cho nhiều người dùng cùng lúc.
     *
     * <p>Quy trình:
     * <ol>
     *     <li>Kiểm tra role có tồn tại hay không.</li>
     *     <li>Lấy ID của admin đang thực hiện thao tác.</li>
     *     <li>Duyệt danh sách user cần gán role.</li>
     *     <li>Kiểm tra user có tồn tại không.</li>
     *     <li>Kiểm tra user đã có role này chưa.</li>
     *     <li>Nếu chưa có thì tạo bản ghi UserRoleEntity.</li>
     *     <li>Ghi nhận audit log cho từng lần gán role thành công.</li>
     *     <li>Thống kê số lượng thành công, thất bại và danh sách lỗi.</li>
     * </ol>
     *
     * @param request chứa roleId và danh sách userIds cần gán role
     * @return kết quả xử lý gồm:
     *         successCount - số user gán thành công
     *         failureCount - số user thất bại
     *         errors - danh sách lỗi chi tiết
     */
    @Transactional
    @Override
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
                    ur.setAssignedAt(LocalDateTime.now());
                    userRoleRepository.save(ur);

                    eventPublisher.publishEvent(new AuditLogEvent(this, "grant_role", "user", currentAdminId, null, "Granted role " + role.getName()));
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
     * Lấy toàn bộ Permission có hiệu lực của người dùng.
     * Permission được tổng hợp từ tất cả Role còn hiệu lực.
     * Nếu nhiều Role chứa cùng Permission thì chỉ trả về một lần.
     */
    @Transactional(readOnly = true)
    @Override
    public List<EffectivePermissionResponse> getEffectivePermissions(Long userId) {
        List<UserRoleEntity> activeUserRoles = userRoleRepository.findActiveUserRoleWithPermissions(userId, LocalDateTime.now());
        Map<Long, EffectivePermissionResponse> permMap = new HashMap<>();

        for (UserRoleEntity ur : activeUserRoles) {
            RoleEntity role = ur.getRoleEntity();
            for (RolePermissionEntity rp : role.getRolePermissions()) {
                PermissionEntity perm = rp.getPermissionEntity();
                EffectivePermissionResponse resp = permMap.computeIfAbsent(perm.getId(), id -> {
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
     * <p>Toàn bộ Role hiện tại sẽ bị xóa và được thay thế
     * bằng danh sách Role mới được cung cấp.</p>
     *
     * <p>Được sử dụng trong luồng cập nhật quyền của người dùng.</p>
     *
     * @param userId   ID người dùng.
     * @param request  Danh sách Role mới cần gán.
     */
    @Transactional
    @Override
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

            UserRoleEntity ur = buildUserRole(user, role, currentAdminId);
            userRoleRepository.save(ur);
        }

        eventPublisher.publishEvent(new AuditLogEvent(this, "assign_roles", "user", currentAdminId, null, request.getRoleIds()));
    }

    /**
     * Gán danh sách Role ban đầu cho User mới tạo.
     *
     * <p>Phương thức chỉ thêm các Role được truyền vào,
     * không xóa hoặc thay thế Role hiện có.</p>
     *
     * <p>Được sử dụng trong luồng tạo mới người dùng.</p>
     *
     * @param user     Người dùng cần gán Role.
     * @param roleIds  Danh sách ID Role.
     * @param adminId  ID quản trị viên thực hiện thao tác.
     */
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
                .assignedAt(LocalDateTime.now())
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
    @Override
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
        eventPublisher.publishEvent(new AuditLogEvent(this, "verify_email_change", "user", userId, oldState, user));
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
                .filter(ur -> ur.getExpiredAt() == null || ur.getExpiredAt().isAfter(LocalDateTime.now()))
                .map(ur -> ur.getRoleEntity().getCode())
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

    @Override
    public long countStudents() {
        log.info("Lấy ra số lượng học viên");
        return studentProfileService.countStudents();
    }

    @Override
    public long countEmployees() {
        log.info("Lấy ra số lượng nhân viên");
        return employeeService.countEmployees();
    }

    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countUsersByRole() {
        log.info("Thống kê số lượng user theo từng vai trò");
        List<Object[]> results = userRoleRepository.countUsersGroupByRole();
        Map<String, Long> countMap = new HashMap<>();
        for (Object[] row : results) {
            String roleName = (String) row[0];
            Long count = (Long) row[1];
            if (roleName != null) {
                countMap.put(roleName, count);
            }
        }
        return countMap;
    }

    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countUsersByGender() {
        log.info("Thống kê số lượng user theo giới tính");
        List<Object[]> results = userRepository.countUsersGroupByGender();
        Map<String, Long> countMap = new LinkedHashMap<>();
        countMap.put("NAM", 0L);
        countMap.put("NU", 0L);
        countMap.put("KHAC", 0L);

        for (Object[] row : results) {
            Integer gender = (Integer) row[0];
            Long count = (Long) row[1];
            if (gender == null) {
                continue;
            }
            String key;
            if (gender == 0) {
                key = "NAM";
            } else if (gender == 1) {
                key = "NU";
            } else {
                key = "KHAC";
            }

            countMap.put(key, countMap.getOrDefault(key, 0L) + count);
        }
        return countMap;
    }

    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countUsersByStatus() {
        log.info("Thống kê số lượng user theo trạng thái");
        List<Object[]> results = userRepository.countUsersGroupByStatus();
        Map<String, Long> statusMap = new HashMap<>();
        for (Object[] row : results) {
            UserStatusEnum status = (UserStatusEnum) row[0];
            Long count = (Long) row[1];
            if (status != null) {
                statusMap.put(status.name(), count);
            }
        }
        return statusMap;
    }

    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countUsersByAgeGroup() {
        log.info("Thống kê số lượng user theo độ tuổi");
        List<UserEntity> users = userRepository.findAllByStatusNot(UserStatusEnum.DELETED);
        Map<String, Long> ageGroupMap = new LinkedHashMap<>();
        ageGroupMap.put("< 12", 0L);
        ageGroupMap.put("12 - 17", 0L);
        ageGroupMap.put("18 - 24", 0L);
        ageGroupMap.put("24 - 34", 0L);
        ageGroupMap.put("35 - 54", 0L);
        ageGroupMap.put("55+", 0L);

        LocalDate now = LocalDate.now();
        for (UserEntity user : users) {
            if (user == null) {
                continue;
            }

            if (user.getDateOfBirth() == null) {
                continue;
            }

            LocalDate dob = user.getDateOfBirth().toLocalDate();
            int age = Period.between(dob, now).getYears();

            String group;
            if (age < 12) {
                group = "< 12";
            } else if (age <= 17) {
                group = "12 - 17";
            } else if (age <= 24) {
                group = "18 - 24";
            } else if (age <= 34) {
                group = "24 - 34";
            } else if (age <= 54) {
                group = "35 - 54";
            } else {
                group = "55+";
            }

            ageGroupMap.merge(group, 1L, Long::sum);
        }

        return ageGroupMap;
    }

    @Transactional(readOnly = true)
    @Override
    public Map<String, Long> countEmployeesByStatus() {
        log.info("Thống kê số lượng nhân viên theo trạng thái");
        List<Object[]> results = employeeRepository.countEmployeesGroupByStatus(EmployeeStatusEnum.DELETE);
        Map<String, Long> statusMap = new HashMap<>();
        for (Object[] row : results) {
            EmployeeStatusEnum status = (EmployeeStatusEnum) row[0];
            Long count = (Long) row[1];
            if (status != null) {
                statusMap.put(status.name(), count);
            }
        }
        return statusMap;
    }

    @Transactional(readOnly = true)
    @Override
    public List<MonthlyUserCountResponse> getMonthlyNewUsers(Integer year) {
        int targetYear = (year != null && year > 0) ? year : LocalDate.now().getYear();
        log.info("Lấy số lượng người dùng mới theo tháng trong năm: {}", targetYear);
        List<Object[]> queryResults = userRepository.countMonthlyNewUsersByYear(targetYear);
        Map<Integer, Long> monthCountMap = new HashMap<>();
        for (Object[] row : queryResults) {
            Integer month = (Integer) row[0];
            Long count = (Long) row[1];
            if (month != null) {
                monthCountMap.put(month, count);
            }
        }

        List<MonthlyUserCountResponse> responseList = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            responseList.add(MonthlyUserCountResponse.builder()
                    .month(m)
                    .count(monthCountMap.getOrDefault(m, 0L))
                    .build());
        }
        return responseList;
    }

    @Transactional(readOnly = true)
    @Override
    public UserDetailResponse getUserDetail(Long userId) {
        log.info("Lấy thông tin chi tiết người dùng: {}", userId);
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        UserResponse accountInfo = mapToUserResponse(user);

        StudentProfileResponse studentProfile = studentProfileService.findByIdOrNull(userId);
        List<GuardianResponse> guardians = new ArrayList<>();
        if (studentProfile != null) {
            List<GuardianEntity> guardianEntities = guardianRepository.findByStudentProfile_UserId(userId);
            if (guardianEntities != null && !guardianEntities.isEmpty()) {
                guardians = guardianMapper.toResponseList(guardianEntities);
            }
        }

        EmployeeResponse employeeProfile = employeeService.findByIdOrNull(userId);

        return UserDetailResponse.builder()
                .userAccount(accountInfo)
                .studentProfile(studentProfile)
                .guardians(guardians)
                .employeeProfile(employeeProfile)
                .createdBy(user.getCreatedBy())
                .updatedBy(user.getUpdatedBy())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }


    @Override
    public void sendBulkEmail(SendBulkEmailRequest request) {
        log.info("Gửi email tới nhiều tài khoản");
        if (request == null || request.getEmails() == null || request.getEmails().isEmpty()) {
            throw new BusinessException("Danh sách email không được để trống.");
        }
        emailService.sendBulkEmail(request.getEmails(), request.getSubject(), request.getContent());
    }

    @Transactional(readOnly = true)
    @Override
    public byte[] exportUsersToExcel(UserSearchRequest request) {
        log.info("Xuất file danh sách người dùng qua CsvExport util");

        List<UserResponse> users = request != null
                ? getUsers(request).getContent()
                : getAllUsers();

        List<String> headers = List.of(
                "ID", "Username", "Email", "Họ và tên",
                "Số điện thoại", "Giới tính", "Trạng thái", "Vai trò", "Ngày tạo"
        );


        List<Function<UserResponse, Object>> extractors = List.of(
                UserResponse::getId,
                UserResponse::getUsername,
                UserResponse::getEmail,
                UserResponse::getFullName,
                UserResponse::getPhone,
                u -> u.getGender() == null ? "Chưa xác định" : (u.getGender() == 0 ? "Nam" : (u.getGender() == 1 ? "Nữ" : "Khác")),
                u -> u.getStatus() != null ? u.getStatus().name() : "",
                u -> u.getRoles() != null ? String.join("; ", u.getRoles()) : "",
                u -> u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
        );

        return CsvExport.exportToCsv(headers, users, extractors, true);
    }

    @Transactional(readOnly = true)
    @Override
    public byte[] exportUserDetailToExcel(Long userId) {
        log.info("Xuất file Excel chi tiết người dùng: {}", userId);
        UserDetailResponse detail = getUserDetail(userId);

        StringBuilder sb = new StringBuilder();
        sb.append("\uFEFF"); // UTF-8 BOM

        // 1. THÔNG TIN TÀI KHOẢN (USER ACCOUNT)
        sb.append("=== THÔNG TIN TÀI KHOẢN ===\n");
        sb.append("Trường,Giá trị\n");
        UserResponse acc = detail.getUserAccount();
        if (acc != null) {
            sb.append("ID,").append(acc.getId() != null ? acc.getId() : "").append("\n");
            sb.append("Tên đăng nhập,").append(escapeCsvValue(acc.getUsername())).append("\n");
            sb.append("Email,").append(escapeCsvValue(acc.getEmail())).append("\n");
            sb.append("Họ và tên,").append(escapeCsvValue(acc.getFullName())).append("\n");
            sb.append("Số điện thoại,").append(escapeCsvValue(acc.getPhone())).append("\n");
            sb.append("Giới tính,").append(acc.getGender() == null ? "Chưa xác định" : (acc.getGender() == 0 ? "Nam" : (acc.getGender() == 1 ? "Nữ" : "Khác"))).append("\n");
            sb.append("Trạng thái,").append(acc.getStatus() != null ? acc.getStatus().name() : "").append("\n");
            sb.append("Vai trò,").append(acc.getRoles() != null ? escapeCsvValue(String.join("; ", acc.getRoles())) : "").append("\n");
            sb.append("Ngày sinh,").append(acc.getDateOfBirth() != null ? acc.getDateOfBirth().toString() : "").append("\n");
            sb.append("Đăng nhập gần nhất,").append(acc.getLastLoginAt() != null ? acc.getLastLoginAt().toString() : "").append("\n");
        }
        sb.append("\n");

        // 2. THÔNG TIN CÁ NHÂN HỌC VIÊN (NẾU CÓ)
        if (detail.getStudentProfile() != null) {
            sb.append("=== THÔNG TIN CÁ NHÂN HỌC VIÊN ===\n");
            sb.append("Trường,Giá trị\n");
            StudentProfileResponse st = detail.getStudentProfile();
            sb.append("Mã học viên,").append(escapeCsvValue(st.getStudentCode())).append("\n");
            sb.append("Trình độ học vấn,").append(escapeCsvValue(st.getEducationLevel())).append("\n");
            sb.append("Trường học,").append(escapeCsvValue(st.getSchoolName())).append("\n");
            sb.append("Mục tiêu,").append(escapeCsvValue(st.getGoal())).append("\n");
            sb.append("Mô tả,").append(escapeCsvValue(st.getDescription())).append("\n");
            sb.append("Vị thành niên (<18 tuổi),").append(Boolean.TRUE.equals(st.getIsMinor()) ? "Có" : "Không").append("\n");
            sb.append("Đã tạo mục tiêu,").append(Boolean.TRUE.equals(st.getHasGoal()) ? "Rồi" : "Chưa").append("\n");
            sb.append("\n");

            // THÔNG TIN PHỤ HUYNH / NGƯỜI GIÁM HỘ
            if (detail.getGuardians() != null && !detail.getGuardians().isEmpty()) {
                sb.append("=== DANH SÁCH PHỤ HUYNH / NGƯỜI GIÁM HỘ ===\n");
                sb.append("STT,Họ và tên,Số điện thoại,Mối quan hệ,Email,Địa chỉ\n");
                int gIndex = 1;
                for (GuardianResponse g : detail.getGuardians()) {
                    sb.append(gIndex++).append(",")
                            .append(escapeCsvValue(g.getFullName())).append(",")
                            .append(escapeCsvValue(g.getPhone())).append(",")
                            .append(escapeCsvValue(g.getRelationship().name())).append(",")
                            .append(escapeCsvValue(g.getEmail())).append(",")
                            .append(escapeCsvValue(g.getAddress())).append("\n");
                }
                sb.append("\n");
            }
        }

        // 3. THÔNG TIN CÁ NHÂN NHÂN VIÊN (NẾU CÓ)
        if (detail.getEmployeeProfile() != null) {
            sb.append("=== THÔNG TIN CÁ NHÂN NHÂN VIÊN ===\n");
            sb.append("Trường,Giá trị\n");
            EmployeeResponse emp = detail.getEmployeeProfile();
            sb.append("Mã nhân viên,").append(escapeCsvValue(emp.getEmployeeCode())).append("\n");
            sb.append("Phòng ban,").append(emp.getDepartmentName() != null ? escapeCsvValue(emp.getDepartmentName()) : "").append("\n");
            sb.append("Chức vụ,").append(escapeCsvValue(emp.getPosition())).append("\n");
            sb.append("Loại hình làm việc,").append(emp.getEmploymentTypeEnum() != null ? emp.getEmploymentTypeEnum().name() : "").append("\n");
            sb.append("Trạng thái nhân sự,").append(emp.getStatus() != null ? emp.getStatus().name() : "").append("\n");
            sb.append("Ngày bắt đầu làm việc,").append(emp.getStartDate() != null ? emp.getStartDate().toString() : "").append("\n");
            sb.append("Ngày kết thúc,").append(emp.getEndDate() != null ? emp.getEndDate().toString() : "").append("\n");
            sb.append("\n");
        }

        // 4. THÔNG TIN HỆ THỐNG
        sb.append("=== THÔNG TIN HỆ THỐNG ===\n");
        sb.append("Trường,Giá trị\n");
        sb.append("ID người tạo,").append(detail.getCreatedBy() != null ? detail.getCreatedBy() : "").append("\n");
        sb.append("ID người cập nhật,").append(detail.getUpdatedBy() != null ? detail.getUpdatedBy() : "").append("\n");
        sb.append("Thời gian tạo,").append(detail.getCreatedAt() != null ? detail.getCreatedAt().toString() : "").append("\n");
        sb.append("Thời gian cập nhật,").append(detail.getUpdatedAt() != null ? detail.getUpdatedAt().toString() : "").append("\n");

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsvValue(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }



    @Transactional
    @Override
    public Map<String, Object> bulkCreateEmployees(BulkCreateEmployeeRequest request) {
        log.info("Thêm nhiều nhân viên theo danh sách email");
        if (request == null || request.getEmails() == null || request.getEmails().isEmpty()) {
            throw new BusinessException("Danh sách email không được để trống.");
        }

        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new ArrayList<>();
        List<EmployeeResponse> createdEmployees = new ArrayList<>();

        for (String email : request.getEmails()) {
            if (email == null || email.isBlank()) {
                continue;
            }
            try {
                CreateEmployeeRequest empReq = CreateEmployeeRequest.builder()
                        .email(email.trim())
                        .departmentId(request.getDepartmentId())
                        .roleCode(request.getRoleCode() != null ? request.getRoleCode() : "EMPLOYEE")
                        .build();

                EmployeeResponse created = employeeService.create(empReq);
                createdEmployees.add(created);
                successCount++;
            } catch (Exception e) {
                failureCount++;
                errors.add("Email " + email + ": " + e.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("errors", errors);
        result.put("createdEmployees", createdEmployees);
        return result;
    }
}

