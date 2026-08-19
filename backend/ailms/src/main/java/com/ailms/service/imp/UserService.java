package com.ailms.service.imp;
import com.ailms.common.converter.SimpleJsonWriter;
import com.ailms.common.util.CsvBuilder;
import com.ailms.event.AuditLogEvent;
import com.ailms.service.IEmailService;
import com.ailms.service.IUserService;
import com.ailms.service.IStudentProfileService;
import com.ailms.service.IEmployeeService;
import org.springframework.context.ApplicationEventPublisher;


import com.ailms.entity.*;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.FileTypeEnum;
import com.ailms.entity.enums.FileUsageTypeEnum;
import com.ailms.entity.enums.GuardianRelationship;
import com.ailms.mapper.UserMapper;
import com.ailms.mapper.GuardianMapper;
import com.ailms.repository.*;
import com.ailms.repository.specification.UserSpecification;
import com.ailms.request.*;
import com.ailms.response.*;
import com.ailms.common.util.CodeGenerator;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.ailms.exception.DuplicateResourceException;
import com.ailms.exception.ResourceNotFoundException;
import com.ailms.exception.BusinessException;
import com.ailms.security.JwtUtils;
import com.ailms.service.IFileService;
import com.ailms.service.IFileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.ailms.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.EntityManager;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class
UserService implements IUserService {

    @Value("${api.prefix}")
    private String apiPrefix;

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
    private final StudentProfileRepository studentProfileRepository;
    private final TeacherCategoryRepository teacherCategoryRepository;
    private final DepartmentRepository departmentRepository;
    private final IFileService fileService;
    private final IFileStorageService fileStorageService;
    private final EntityManager entityManager;
    private final com.ailms.search.MeilisearchUserService meilisearchUserService;

    @Value("${app.frontend.set-password:http://localhost:5173/set-password}")
    private String setPasswordUrl;


    @Transactional(readOnly = true)
    @Override
    public PageResponse<UserResponse> getUsers(UserSearchRequest request) {
        // Các endpoint lọc theo vai trò phải đọc DB để không trả index Meilisearch đã thiếu role.
        if (request != null && org.springframework.util.StringUtils.hasText(request.getRoleType())) {
            Specification<UserEntity> spec = UserSpecification.filterAndSearch(request);
            Page<UserEntity> page = userRepository.findAll(spec, request.toPageable());
            return PageResponse.from(page.map(this::mapToUserResponse));
        }
        PageResponse<UserResponse> indexedResult = meilisearchUserService.search(request);
        if (indexedResult != null) {
            return indexedResult;
        }

        Specification<UserEntity> spec = UserSpecification.filterAndSearch(request);
        Page<UserEntity> page = userRepository.findAll(spec, request.toPageable());
        return PageResponse.from(page.map(this::mapToUserResponse));
    }

    /** Khởi tạo cấu hình và đồng bộ lại index người dùng sau khi ứng dụng sẵn sàng. */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void initializeUserSearchIndex() {
        if (!meilisearchUserService.isEnabled()) return;
        userRepository.findAll().forEach(meilisearchUserService::index);
        meilisearchUserService.configureIndex();
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .toList();
    }

    @Transactional
    @Override
    public UserResponse getUserById(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));
        ensureSupportEmployeeProfile(user, getRoleCodes(id));
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
        autoProvisionEmployeeProfileIfStaffRole(user, request.getRoleIds());

        if (!hasPassword) {
            String token = jwtUtils.generateSetPasswordToken(user.getId());
            log.info("Invite JWT Token = {}", token);
            String inviteLink = setPasswordUrl.contains("?") ? setPasswordUrl + "&token=" + token : setPasswordUrl + "?token=" + token;
            emailService.sendInviteEmail(user.getEmail(), inviteLink);
        }

        eventPublisher.publishEvent(new AuditLogEvent(this, "create_user", "user", adminId, null, user));

        meilisearchUserService.index(user);

        return mapToUserResponse(user);
    }

    @Transactional
    @Override
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        return updateBasicProfile(userId, request);
    }

    @Transactional
    @Override
    public UserResponse updateBasicProfile(Long userId, UpdateProfileRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));

        UserEntity oldUser = userMapper.cloneUser(user);
        if (request.getFullName() != null) {
            user.setFullName(trimToNull(request.getFullName()));
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth().atStartOfDay());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }
        user = userRepository.save(user);

        eventPublisher.publishEvent(new AuditLogEvent(this, "update_basic_profile", "user", userId, oldUser, user));
        return mapToUserResponse(user);
    }

    @Transactional
    @Override
    public UserResponse updateRoleProfile(Long userId, UpdateRoleProfileRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        Set<String> roles = getRoleCodes(userId);
        UserEntity oldUser = userMapper.cloneUser(user);

        boolean isStaff = roles.stream().anyMatch(role -> Set.of("ADMIN", "HR", "TEACHER", "TA", "SUPPORT").contains(role));
        ensureSupportEmployeeProfile(user, roles);
        if (roles.contains("STUDENT") && !isStaff) {
            StudentProfileEntity profile = studentProfileRepository.findById(userId)
                    .orElseGet(() -> StudentProfileEntity.builder()
                            .userEntity(user)
                            .studentCode(CodeGenerator.generate("ST", studentProfileRepository::existsByStudentCode))
                            .hasGoal(false)
                            .isMinor(false)
                            .build());
            profile.setEducationLevel(request.getEducationLevel());
            profile.setSchoolName(request.getSchoolName());
            profile.setGoal(request.getGoal());
            profile.setDescription(request.getDescription());
            if (request.getIsMinor() != null) {
                profile.setIsMinor(request.getIsMinor());
            }
            if (request.getGoal() != null && !request.getGoal().isBlank()) {
                profile.setHasGoal(true);
            }
            profile = studentProfileRepository.save(profile);
            replaceGuardians(profile, request.getGuardians());
        } else {
            EmployeeEntity employee = employeeRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found for user: " + userId));

            if (roles.contains("ADMIN")) {
                if (request.getDepartmentId() != null) {
                    employee.setDepartment(departmentRepository.findById(request.getDepartmentId())
                            .orElseThrow(() -> ResourceNotFoundException.of("Department", request.getDepartmentId())));
                }
                employee.setPosition(request.getPosition());
                if (request.getEmploymentTypeEnum() != null) {
                    employee.setEmploymentTypeEnum(request.getEmploymentTypeEnum());
                }
                if (request.getStartDate() != null) {
                    employee.setStartDate(request.getStartDate().atStartOfDay());
                }
            }
            if (request.getAddress() != null) {
                employee.setAddress(request.getAddress());
            }
            if (request.getBio() != null) {
                employee.setBio(request.getBio().trim());
            }
            employeeRepository.save(employee);
        }

        UserResponse response = mapToUserResponse(user);
        eventPublisher.publishEvent(new AuditLogEvent(this, "update_role_profile", "user", userId, oldUser, response));
        return response;
    }

    @Transactional
    @Override
    public UserResponse uploadAvatar(Long userId, MultipartFile file) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        validateAvatarFile(file);

        UserEntity oldUser = userMapper.cloneUser(user);
        FileMetadataResponse metadata = fileService.uploadFile(file, FileTypeEnum.IMAGE, FileUsageTypeEnum.AVATAR, userId, "UserEntity");
        if (!fileStorageService.exists(metadata.getFileKey())) {
            throw new BusinessException("Không thể lưu avatar lên MinIO. Vui lòng kiểm tra MinIO và thử lại.");
        }
        user.setAvatarUrl(metadata.getFileKey());
        user = userRepository.save(user);

        eventPublisher.publishEvent(new AuditLogEvent(this, "upload_avatar", "user", userId, oldUser, user));
        return mapToUserResponse(user);
    }

    @Transactional
    @Override
    public UserResponse deleteAvatar(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", userId));
        UserEntity oldUser = userMapper.cloneUser(user);
        user.setAvatarUrl(null);
        user = userRepository.save(user);

        eventPublisher.publishEvent(new AuditLogEvent(this, "delete_avatar", "user", userId, oldUser, user));
        return mapToUserResponse(user);
    }

    @Transactional(readOnly = true)
    @Override
    public InputStream downloadAvatar(Long targetUserId) {
        UserEntity user = userRepository.findById(targetUserId)
                .orElseThrow(() -> ResourceNotFoundException.of("User", targetUserId));
        String fileKey = normalizeAvatarFileKey(user.getAvatarUrl());
        if (fileKey == null) {
            throw new ResourceNotFoundException("Avatar not found for user: " + targetUserId);
        }
        return fileStorageService.download(fileKey);
    }


    @Transactional
    @Override
    public UserResponse updateUser(Long id, UpdateUserRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        userMapper.updateUserEntity(user, request);
        user = userRepository.save(user);
        meilisearchUserService.index(user);

        // Log audit
        eventPublisher.publishEvent(new AuditLogEvent(this, "update_user", "user", id, null, user));
        return mapToUserResponse(user);
    }

    @Transactional
    @Override
    public void deleteUser(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("User", id));

        meilisearchUserService.delete(id);

        String oldState = SimpleJsonWriter.toJson(user);
        if (user.getStatus() == UserStatusEnum.DELETED) {
            return;
        }

        user.setStatusBeforeDelete(user.getStatus());
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

            // Tạo biến final riêng để dùng trong lambda
            final UserEntity savedUser = user;

            // Assign roles from request, or fallback to STUDENT
            List<Long> roleIds = request.getRoleIds();
            if (roleIds != null && !roleIds.isEmpty()) {
                for (Long roleId : roleIds) {
                    roleRepository.findById(roleId).ifPresent(role -> {
                        UserRoleEntity userRole = UserRoleEntity.builder()
                                .userEntity(savedUser) // dùng savedUser thay vì user
                                .roleEntity(role)
                                .build();
                        userRoleRepository.save(userRole);
                    });
                }
            } else {
                roleRepository.findByCode("STUDENT").ifPresent(role -> {
                    UserRoleEntity userRole = UserRoleEntity.builder()
                            .userEntity(savedUser) // dùng savedUser thay vì user
                            .roleEntity(role)
                            .build();
                    userRoleRepository.save(userRole);
                });
            }
            autoProvisionEmployeeProfileIfStaffRole(user, roleIds);
        }
        String token = jwtUtils.generateSetPasswordToken(user.getId());
        log.info("Invite token = {}", token);

        log.info("send Invite");
        // Send Email invite link
        String inviteLink = setPasswordUrl.contains("?") ? setPasswordUrl + "&token=" + token : setPasswordUrl + "?token=" + token;
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

        // Kích hoạt trạng thái hồ sơ nhân viên nếu đang ở PROBATION/chờ
        employeeRepository.findById(user.getId()).ifPresent(emp -> {
            if (emp.getStatus() == EmployeeStatusEnum.PROBATION) {
                emp.setStatus(EmployeeStatusEnum.ACTIVE);
                employeeRepository.save(emp);
            }
        });

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
                user.setStatusBeforeDelete(user.getStatus());
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
     * Gỡ vai trò hàng loạt cho nhiều người dùng cùng lúc.
     * Quy tắc kiểm tra:
     * 1. Kiểm tra roleId có tồn tại hay không.
     * 2. Kiểm tra từng user có tồn tại không.
     * 3. Kiểm tra user có đang sở hữu roleId này hay không.
     * 4. Kiểm tra user có duy trì tối thiểu 1 role sau khi gỡ (không được gỡ role cuối cùng).
     */
    @Transactional
    @Override
    public Map<String, Object> bulkRemoveRole(BulkRemoveRoleRequest request) {
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
                errors.add("User ID " + userId + ": Không tìm thấy người dùng");
                continue;
            }

            UserEntity user = userOpt.get();
            List<UserRoleEntity> userRoles = userRoleRepository.findByUserEntity_Id(userId);

            Optional<UserRoleEntity> targetUserRole = userRoles.stream()
                    .filter(ur -> ur.getRoleEntity().getId().equals(request.getRoleId()))
                    .findFirst();

            if (targetUserRole.isEmpty()) {
                failureCount++;
                errors.add("Người dùng " + user.getFullName() + " (" + user.getEmail() + ") không có vai trò " + role.getName());
                continue;
            }

            if (userRoles.size() <= 1) {
                failureCount++;
                errors.add("Không thể gỡ vai trò " + role.getName() + " khỏi " + user.getFullName() + ": Người dùng phải giữ ít nhất 1 vai trò");
                continue;
            }

            try {
                userRoleRepository.delete(targetUserRole.get());
                eventPublisher.publishEvent(new AuditLogEvent(this, "revoke_role", "user", currentAdminId, null, "Gỡ vai trò " + role.getName() + " khỏi user " + user.getEmail()));
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
                EffectivePermissionResponse resp = permMap.computeIfAbsent(perm.getId(), _ -> {
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

        autoProvisionEmployeeProfileIfStaffRole(user, request.getRoleIds());

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
            // Fallback: gán STUDENT mặc định nếu không chỉ định role
            roleRepository.findByCode("STUDENT").ifPresent(role -> {
                UserRoleEntity userRole = buildUserRole(user, role, adminId);
                userRoleRepository.save(userRole);
            });
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
        response.setAvatarUrl(toAvatarViewUrl(user));
        response.setAttributes(buildProfileAttributes(user, response.getRoles()));
        return response;
    }

    private Set<String> getRoleCodes(Long userId) {
        return userRoleRepository.findByUserEntity_Id(userId).stream()
                .filter(ur -> ur.getExpiredAt() == null || ur.getExpiredAt().isAfter(LocalDateTime.now()))
                .map(ur -> ur.getRoleEntity().getCode())
                .filter(Objects::nonNull)
                .map(code -> code.toUpperCase(Locale.ROOT).replace("ROLE_", ""))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String buildProfileAttributes(UserEntity user, List<String> roles) {
        Map<String, Object> attrs = new LinkedHashMap<>();
        Set<String> roleCodes = roles == null ? Set.of() : roles.stream()
                .filter(Objects::nonNull)
                .map(code -> code.toUpperCase(Locale.ROOT).replace("ROLE_", ""))
                .collect(Collectors.toSet());

        boolean isStaff = roleCodes.stream().anyMatch(role -> Set.of("ADMIN", "HR", "TEACHER", "TA", "SUPPORT").contains(role));
        if (roleCodes.contains("STUDENT") && !isStaff) {
            studentProfileRepository.findById(user.getId()).ifPresent(profile -> {
                attrs.put("studentCode", profile.getStudentCode());
                attrs.put("educationLevel", profile.getEducationLevel());
                attrs.put("schoolName", profile.getSchoolName());
                attrs.put("goal", profile.getGoal());
                attrs.put("description", profile.getDescription());
                attrs.put("isMinor", profile.getIsMinor());
                attrs.put("hasGoal", profile.getHasGoal());
                attrs.put("currentStreak", profile.getCurrentStreak());
                attrs.put("longestStreak", profile.getLongestStreak());
                List<String> interests = profile.getStudentInterests() == null ? List.of() : profile.getStudentInterests().stream()
                        .map(StudentInterestEntity::getInterest)
                        .filter(Objects::nonNull)
                        .map(InterestEntity::getName)
                        .filter(name -> name != null && !name.isBlank())
                        .toList();
                if (!interests.isEmpty()) {
                    attrs.put("interests", interests);
                }
                attrs.put("guardians", guardianRepository.findByStudentProfile_UserId(user.getId()).stream()
                        .map(this::guardianToMap)
                        .toList());
            });
        } else {
            employeeRepository.findById(user.getId()).ifPresent(employee -> {
                attrs.put("employeeCode", employee.getEmployeeCode());
                attrs.put("departmentId", employee.getDepartment() != null ? employee.getDepartment().getId() : null);
                attrs.put("departmentName", employee.getDepartment() != null ? employee.getDepartment().getName() : null);
                attrs.put("position", employee.getPosition());
                attrs.put("employmentTypeEnum", employee.getEmploymentTypeEnum() != null ? employee.getEmploymentTypeEnum().name() : null);
                attrs.put("startDate", employee.getStartDate() != null ? employee.getStartDate().toLocalDate().toString() : null);
                attrs.put("endDate", employee.getEndDate() != null ? employee.getEndDate().toLocalDate().toString() : null);
                attrs.put("address", employee.getAddress());
                attrs.put("status", employee.getStatus() != null ? employee.getStatus().name() : null);
                if (employee.getPosition() != null && !employee.getPosition().isBlank()) {
                    attrs.put("specialty", employee.getPosition());
                }
                if (teacherCategoryRepository != null && employee.getUserEntity() != null) {
                    List<String> categories = teacherCategoryRepository.findByEmployee_UserId(employee.getUserEntity().getId()).stream()
                            .map(TeacherCategoryEntity::getCategory)
                            .filter(Objects::nonNull)
                            .map(CategoryEntity::getName)
                            .filter(name -> name != null && !name.isBlank())
                            .toList();
                    if (!categories.isEmpty()) {
                        attrs.put("categories", categories);
                    }
                }
            });
        }

        return SimpleJsonWriter.toJson(attrs);
    }

    private Map<String, Object> guardianToMap(GuardianEntity guardian) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", guardian.getId());
        value.put("fullName", guardian.getFullName());
        value.put("relationship", guardian.getRelationship() != null ? guardian.getRelationship().name() : null);
        value.put("phone", guardian.getPhone());
        value.put("email", guardian.getEmail());
        value.put("address", guardian.getAddress());
        return value;
    }

    /** Bảo đảm tài khoản SUPPORT cũ cũng có EmployeeEntity như HR và các staff khác. */
    private void ensureSupportEmployeeProfile(UserEntity user, Set<String> roleCodes) {
        if (user == null || user.getId() == null || roleCodes == null || !roleCodes.contains("SUPPORT")
                || employeeRepository.existsById(user.getId())) return;
        EmployeeEntity employee = EmployeeEntity.builder().userEntity(user)
                .employeeCode(CodeGenerator.generate("EP", employeeRepository::existsByEmployeeCode))
                .position("Nhân viên hỗ trợ").employmentTypeEnum(EmploymentTypeEnum.FULL_TIME)
                .startDate(LocalDateTime.now()).status(EmployeeStatusEnum.ACTIVE).build();
        employeeRepository.save(employee);
        log.info("Auto-provisioned EmployeeEntity for SUPPORT user {}", user.getId());
    }

    private void replaceGuardians(StudentProfileEntity profile, List<ProfileGuardianRequest> guardians) {
        if (guardians == null) {
            return;
        }
        guardianRepository.deleteByStudentProfile_UserId(profile.getUserId());
        List<GuardianEntity> entities = new ArrayList<>();
        for (ProfileGuardianRequest item : guardians) {
            if (item == null || item.getFullName() == null || item.getFullName().isBlank()) {
                continue;
            }
            GuardianEntity entity = new GuardianEntity();
            entity.setStudentProfile(profile);
            entity.setFullName(item.getFullName().trim());
            entity.setRelationship(item.getRelationship() != null ? item.getRelationship() : GuardianRelationship.OTHER);
            entity.setPhone(item.getPhone());
            entity.setEmail(item.getEmail());
            entity.setAddress(item.getAddress());
            entities.add(entity);
        }
        guardianRepository.saveAll(entities);
    }

    private void validateAvatarFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Avatar file is required.");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BusinessException("Avatar file must not exceed 5MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new BusinessException("Avatar must be an image file.");
        }
    }

    private String toAvatarViewUrl(UserEntity user) {
        String avatarUrl = user.getAvatarUrl();
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return null;
        }
        String value = avatarUrl.trim();
        if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/v1/users/")) {
            return value;
        }
        return apiPrefix + "/users/" + user.getId() + "/avatar";
    }

    private String normalizeAvatarFileKey(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return null;
        }
        String value = avatarUrl.trim();
        if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/v1/users/")) {
            return null;
        }
        return value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
        List<Object[]> results = userRepository.countUsersGroupByGender(UserStatusEnum.DELETED);
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
    public List<MonthlyUserCountResponse> getMonthlyNewUsers(Integer year) {
        int targetYear = (year != null && year > 0) ? year : LocalDate.now().getYear();
        log.info("Lấy số lượng người dùng mới theo tháng trong năm: {}", targetYear);
        List<Object[]> queryResults = userRepository.countMonthlyNewUsersByYear(targetYear, UserStatusEnum.DELETED);
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
        log.info("Xuất file danh sách người dùng qua CsvBuilder");

        if (request != null) {
            request.setSize(10000);
        }

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
                u -> u.getCreatedAt() != null ? u.getCreatedAt() : ""
        );

        return CsvBuilder.create()
                .tableFromList(headers, users, extractors, "Không có dữ liệu người dùng")
                .build();
    }

    @Transactional(readOnly = true)
    @Override
    public byte[] exportUserDetailToExcel(Long userId) {
        log.info("Xuất file Excel chi tiết người dùng via CsvBuilder: {}", userId);
        UserDetailResponse detail = getUserDetail(userId);

        CsvBuilder builder = CsvBuilder.create();

        // 1. THÔNG TIN TÀI KHOẢN
        UserResponse acc = detail.getUserAccount();
        if (acc != null) {
            LinkedHashMap<String, Object> accFields = new LinkedHashMap<>();
            accFields.put("ID", acc.getId());
            accFields.put("Tên đăng nhập", acc.getUsername());
            accFields.put("Email", acc.getEmail());
            accFields.put("Họ và tên", acc.getFullName());
            accFields.put("Số điện thoại", acc.getPhone());
            accFields.put("Giới tính", acc.getGender() == null ? "Chưa xác định" : (acc.getGender() == 0 ? "Nam" : (acc.getGender() == 1 ? "Nữ" : "Khác")));
            accFields.put("Trạng thái", acc.getStatus());
            accFields.put("Vai trò", acc.getRoles() != null ? String.join("; ", acc.getRoles()) : "");
            accFields.put("Ngày sinh", acc.getDateOfBirth());
            accFields.put("Đăng nhập gần nhất", acc.getLastLoginAt());

            builder.section("THÔNG TIN TÀI KHOẢN")
                   .keyValueBlock(accFields)
                   .blankLine();
        }

        // 2. THÔNG TIN CÁ NHÂN HỌC VIÊN
        if (detail.getStudentProfile() != null) {
            StudentProfileResponse st = detail.getStudentProfile();
            LinkedHashMap<String, Object> stFields = new LinkedHashMap<>();
            stFields.put("Mã học viên", st.getStudentCode());
            stFields.put("Trình độ học vấn", st.getEducationLevel());
            stFields.put("Trường học", st.getSchoolName());
            stFields.put("Mục tiêu", st.getGoal());
            stFields.put("Mô tả", st.getDescription());
            stFields.put("Vị thành niên (<18 tuổi)", Boolean.TRUE.equals(st.getIsMinor()) ? "Có" : "Không");
            stFields.put("Đã tạo mục tiêu", Boolean.TRUE.equals(st.getHasGoal()) ? "Rồi" : "Chưa");

            builder.section("THÔNG TIN CÁ NHÂN HỌC VIÊN")
                   .keyValueBlock(stFields)
                   .blankLine();

            if (detail.getGuardians() != null && !detail.getGuardians().isEmpty()) {
                builder.section("DANH SÁCH PHỤ HUYNH / NGƯỜI GIÁM HỘ")
                       .tableFromList(
                               List.of("Họ và tên", "Số điện thoại", "Mối quan hệ", "Email", "Địa chỉ"),
                               detail.getGuardians(),
                               List.of(
                                       GuardianResponse::getFullName,
                                       GuardianResponse::getPhone,
                                       g -> g.getRelationship() != null ? g.getRelationship().name() : "",
                                       GuardianResponse::getEmail,
                                       GuardianResponse::getAddress
                               ),
                               "Chưa có thông tin người giám hộ"
                       )
                       .blankLine();
            }
        }

        // 3. THÔNG TIN CÁ NHÂN NHÂN VIÊN
        if (detail.getEmployeeProfile() != null) {
            EmployeeResponse emp = detail.getEmployeeProfile();
            LinkedHashMap<String, Object> empFields = new LinkedHashMap<>();
            empFields.put("Mã nhân viên", emp.getEmployeeCode());
            empFields.put("Phòng ban", emp.getDepartmentName());
            empFields.put("Chức vụ", emp.getPosition());
            empFields.put("Loại hình làm việc", emp.getEmploymentTypeEnum());
            empFields.put("Trạng thái nhân sự", emp.getStatus());
            empFields.put("Ngày bắt đầu làm việc", emp.getStartDate());
            empFields.put("Ngày kết thúc", emp.getEndDate());

            builder.section("THÔNG TIN CÁ NHÂN NHÂN VIÊN")
                   .keyValueBlock(empFields)
                   .blankLine();
        }

        // 4. THÔNG TIN HỆ THỐNG
        LinkedHashMap<String, Object> sysFields = new LinkedHashMap<>();
        sysFields.put("ID người tạo", detail.getCreatedBy());
        sysFields.put("ID người cập nhật", detail.getUpdatedBy());
        sysFields.put("Thời gian tạo", detail.getCreatedAt());
        sysFields.put("Thời gian cập nhật", detail.getUpdatedAt());

        builder.section("THÔNG TIN HỆ THỐNG")
               .keyValueBlock(sysFields);

        return builder.build();
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
                        .roleId(request.getRoleId())
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

    @Override
    public List<UserResponse> getTrashUsers() {
        log.info("Getting all trash users with status = DELETED");
        List<UserEntity> trashUsers = userRepository.findByStatus(UserStatusEnum.DELETED);
        return trashUsers.stream().map(this::mapToUserResponse).toList();
    }

    private void executeNativeUpdate(String sql, Long id) {
        entityManager.createNativeQuery(sql)
                .setParameter("id", id)
                .executeUpdate();

    }

    private long countNativeDependencies(String table, String column, Long id) {
        return ((Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM " + table + " WHERE " + column + " = :id")
                .setParameter("id", id).getSingleResult()).longValue();
    }

    @Transactional
    @Override
    public void hardDeleteUser(Long id) {
        log.info("Permanently deleting user ID: {}", id);
        if (!userRepository.existsById(id)) {
            throw ResourceNotFoundException.of("User", id);
        }

        Map<String, Long> dependencies = new LinkedHashMap<>();
        dependencies.put("guardian", countNativeDependencies("guardian", "student_user_id", id));
        dependencies.put("student_interest", countNativeDependencies("student_interest", "student_user_id", id));
        dependencies.put("study_goal", countNativeDependencies("study_goal", "user_id", id));
        dependencies.put("enrollment", countNativeDependencies("enrollment", "user_id", id));
        dependencies.put("learning_activity_log", countNativeDependencies("learning_activity_log", "user_id", id));
        dependencies.put("course_progress", countNativeDependencies("course_progress", "user_id", id));
        dependencies.put("lesson_progress", countNativeDependencies("lesson_progress", "user_id", id));
        dependencies.put("quiz_attempt", countNativeDependencies("quiz_attempt", "user_id", id));
        dependencies.put("submission", countNativeDependencies("submission", "user_id", id));
        dependencies.put("certificate", countNativeDependencies("certificate", "user_id", id));
        dependencies.put("class_member", countNativeDependencies("class_member", "user_id", id));
        dependencies.put("course_member", countNativeDependencies("course_member", "user_id", id));
        dependencies.put("order", countNativeDependencies("`order`", "user_id", id));
        Map<String, Long> existingDependencies = dependencies.entrySet().stream()
                .filter(entry -> entry.getValue() > 0).collect(Collectors.toMap(
                        Map.Entry::getKey, Map.Entry::getValue, (left, right) -> left, LinkedHashMap::new));
        if (!existingDependencies.isEmpty()) {
            throw new BusinessException("Không thể xóa cứng người dùng vì còn dữ liệu phụ thuộc: " + existingDependencies);
        }

        // 1. Delete employee / teacher child records
        executeNativeUpdate("DELETE FROM teacher_availability WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM teacher_category WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM course_teacher WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM teaching_session_payment WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM attendance WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM leave_request WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM employee_contract WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM salary_detail WHERE salary_id IN (SELECT id FROM salary WHERE employee_id = :id)", id);
        executeNativeUpdate("DELETE FROM salary WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM teaching_rate WHERE employee_id = :id", id);
        executeNativeUpdate("DELETE FROM employee WHERE user_id = :id", id);

        // 2. Delete student profile child records
        executeNativeUpdate("DELETE FROM guardian WHERE student_user_id = :id", id);
        executeNativeUpdate("DELETE FROM student_interest WHERE student_user_id = :id", id);
        executeNativeUpdate("DELETE FROM student_profile WHERE user_id = :id", id);

        // 3. Delete student learning & course progress records
        executeNativeUpdate("DELETE FROM quiz_attempt WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM submission WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM lesson_progress WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM course_progress WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM enrollment WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM certificate WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM study_goal WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM class_member WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM course_member WHERE user_id = :id", id);

        // 4. Delete user activity, roles, audit logs, notifications, reviews, cart, search history
        executeNativeUpdate("DELETE FROM user_role WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM audit_log WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM notification WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM cart_item WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM review WHERE user_id = :id", id);
        executeNativeUpdate("DELETE FROM search_history WHERE user_id = :id", id);

        // 5. Delete user entity
        executeNativeUpdate("DELETE FROM `user` WHERE id = :id", id);
        log.info("Successfully permanently deleted user ID: {}", id);
    }

    @Transactional
    @Override
    public Map<String, Object> bulkHardDeleteUsers(List<Long> ids) {
        log.info("Bulk permanently deleting users: {}", ids);
        int successCount = 0;
        int failureCount = 0;
        List<String> errors = new ArrayList<>();

        if (ids != null) {
            for (Long id : ids) {
                try {
                    hardDeleteUser(id);
                    successCount++;
                } catch (Exception e) {
                    failureCount++;
                    errors.add("User ID " + id + ": " + e.getMessage());
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("errors", errors);
        return result;
    }

    /**
     * Tự động khởi tạo hồ sơ nhân sự (EmployeeEntity) riêng biệt nếu User được gán vai trò nhân sự/cán bộ.
     */
    private void autoProvisionEmployeeProfileIfStaffRole(UserEntity user, List<Long> roleIds) {
        if (user == null || user.getId() == null) return;
        if (employeeRepository.existsById(user.getId())) return;

        boolean isStaff = false;
        if (roleIds != null && !roleIds.isEmpty()) {
            for (Long rId : roleIds) {
                Optional<RoleEntity> rOpt = roleRepository.findById(rId);
                if (rOpt.isPresent() && !"STUDENT".equalsIgnoreCase(rOpt.get().getCode())) {
                    isStaff = true;
                    break;
                }
            }
        }

        if (isStaff) {
            UserEntity managedUser = userRepository.findById(user.getId()).orElse(user);
            EmployeeStatusEnum empStatus = managedUser.getStatus() == UserStatusEnum.VERIFICATION
                    ? EmployeeStatusEnum.PROBATION
                    : EmployeeStatusEnum.ACTIVE;

            EmployeeEntity employee = EmployeeEntity.builder()
                    .userEntity(managedUser)
                    .employeeCode(CodeGenerator.generate("EP", employeeRepository::existsByEmployeeCode))
                    .status(empStatus)
                    .employmentTypeEnum(EmploymentTypeEnum.FULL_TIME)
                    .startDate(LocalDateTime.now())
                    .build();
            employeeRepository.save(employee);
            log.info("Auto-provisioned EmployeeEntity profile for staff User ID: {}", managedUser.getId());
        }
    }
}
