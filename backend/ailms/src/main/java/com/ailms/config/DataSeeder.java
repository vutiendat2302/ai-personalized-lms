package com.ailms.config;

import com.ailms.entity.PermissionEntity;
import com.ailms.entity.RoleEntity;
import com.ailms.entity.RolePermissionEntity;
import com.ailms.entity.UserEntity;
import com.ailms.entity.UserRoleEntity;
import com.ailms.entity.EmployeeEntity;
import com.ailms.entity.enums.EmployeeStatusEnum;
import com.ailms.entity.enums.EmploymentTypeEnum;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.common.util.CodeGenerator;
import com.ailms.repository.PermissionRepository;
import com.ailms.repository.RolePermissionRepository;
import com.ailms.repository.RoleRepository;
import com.ailms.repository.UserRepository;
import com.ailms.repository.UserRoleRepository;
import com.ailms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Khởi tạo (seed) dữ liệu mặc định khi ứng dụng khởi động.
 *
 * <p>Bao gồm: các Role hệ thống (ADMIN, TEACHER, TA, STUDENT), user mặc định
 * cho từng role, và gán toàn bộ permission hiện có cho role ADMIN.
 *
 * <p>Toàn bộ thao tác đều idempotent (chạy lại nhiều lần không tạo trùng dữ liệu),
 * dựa trên kiểm tra tồn tại theo {@code code} (Role) và {@code email} (User).
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@Profile("seed")
public class DataSeeder {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_PASSWORD = "Password@123";

    // ===== ADMIN =====
    private static final String ADMIN_ROLE_NAME = "Administrator";
    private static final String ADMIN_ROLE_CODE = "ADMIN";
    private static final String ADMIN_USERNAME = "admin123";
    private static final String ADMIN_EMAIL = "admin@ailms.com";

    //==== HR ====
    private static final String HR_ROLE_NAME = "HR management";
    private static final String HR_ROLE_CODE = "HR";
    private static final String HR_USERNAME = "hrmanagement123";
    private static final String HR_EMAIL = "hr@ailms.com";

    //==== SUPPORT ====
    private static final String SUPPORT_ROLE_NAME = "Support Consultant";
    private static final String SUPPORT_ROLE_CODE = "SUPPORT";
    private static final String SUPPORT_USERNAME = "support123";
    private static final String SUPPORT_EMAIL = "support@ailms.com";

    // ===== TEACHER =====
    private static final String TEACHER_ROLE_NAME = "Teacher";
    private static final String TEACHER_ROLE_CODE = "TEACHER";
    private static final String TEACHER_USERNAME = "teacher123";
    private static final String TEACHER_EMAIL = "teacher@ailms.com";

    // ===== TA =====
    private static final String TA_ROLE_NAME = "Teaching Assistant";
    private static final String TA_ROLE_CODE = "TA";
    private static final String TA_USERNAME = "teacherta123";
    private static final String TA_EMAIL = "ta@ailms.com";

    // ===== STUDENT =====
    private static final String STUDENT_ROLE_NAME = "Student";
    private static final String STUDENT_ROLE_CODE = "STUDENT";
    private static final String STUDENT_USERNAME = "student123";
    private static final String STUDENT_EMAIL = "student@ailms.com";

    /** Đăng ký CommandLineRunner để seed dữ liệu khi ứng dụng khởi động. */
    @Bean
    CommandLineRunner seed() {
        return _ -> seedData();
    }

    /** Thực hiện khởi tạo toàn bộ dữ liệu mặc định. */
    public void seedData() {
        log.info("Starting database seeding...");

        // 1. Seed ADMIN
        RoleEntity adminRole = seedRole(ADMIN_ROLE_NAME, ADMIN_ROLE_CODE, "System Administrator", true);
        seedUser(ADMIN_USERNAME, ADMIN_EMAIL, "Default Administrator", adminRole);
        assignExistingPermissionToAdmin(adminRole);

        // 2. Seed HR
        RoleEntity hrRole = seedRole(HR_ROLE_NAME, HR_ROLE_CODE, "HR Management Role", false);
        seedUser(HR_USERNAME, HR_EMAIL, "Default HR", hrRole);

        // 3. Support tư vấn landing page
        RoleEntity supportRole = seedRole(SUPPORT_ROLE_NAME, SUPPORT_ROLE_CODE, "Landing page support consultant", false);
        UserEntity supportUser = seedUser(
                SUPPORT_USERNAME, SUPPORT_EMAIL, "Default Support Consultant", supportRole);
        seedSupportEmployee(supportUser);

        // 4. Seed TEACHER
        RoleEntity teacherRole = seedRole(TEACHER_ROLE_NAME, TEACHER_ROLE_CODE, "Teacher Role", false);
        seedUser(TEACHER_USERNAME, TEACHER_EMAIL, "Default Teacher", teacherRole);

        // 5. Seed TA
        RoleEntity taRole = seedRole(TA_ROLE_NAME, TA_ROLE_CODE, "Teaching Assistant Role", false);
        seedUser(TA_USERNAME, TA_EMAIL, "Default TA", taRole);

        // 6. Seed STUDENT
        RoleEntity studentRole = seedRole(STUDENT_ROLE_NAME, STUDENT_ROLE_CODE, "Student Role", false);
        seedUser(STUDENT_USERNAME, STUDENT_EMAIL, "Default Student", studentRole);

        log.info("Database seeding completed successfully.");
    }

    /**
     * Hàm dùng chung để tạo Role.
     *
     * <p>Kiểm tra tồn tại theo {@code code} (đây là cột đang có unique constraint
     * trong DB), không dùng {@code name} để tránh insert trùng khi tên hiển thị
     * thay đổi nhưng code giữ nguyên.
     */
    private RoleEntity seedRole(String name, String code, String description, boolean isSystem) {
        Optional<RoleEntity> existing = roleRepository.findByCode(code);

        if (existing.isPresent()) {
            log.info("Role {} already exists, skip", code);
            return existing.get();
        }

        RoleEntity role = RoleEntity.builder()
                .name(name)
                .code(code)
                .description(description)
                .isSystem(isSystem)
                .build();
        role = roleRepository.save(role);
        log.info("Created role {}", code);
        return role;
    }

    /** Hàm dùng chung để tạo User và gán Role. */
    private UserEntity seedUser(String username, String email, String fullName, RoleEntity role) {
        if (userRepository.existsByEmail(email)) {
            log.info("User {} already exists, skip", email);
            return userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalStateException("Seed user lookup failed: " + email));
        }

        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setFullName(fullName);
        user.setStatus(UserStatusEnum.ACTIVE);
        user = userRepository.save(user);

        UserRoleEntity userRole = UserRoleEntity.builder()
                .userEntity(user)
                .assignedBy(user.getId())
                .roleEntity(role)
                .build();
        userRoleRepository.save(userRole);

        log.info("Created default user {}", email);
        return user;
    }

    /** Bảo đảm tài khoản SUPPORT mặc định luôn có hồ sơ EmployeeEntity như HR. */
    private void seedSupportEmployee(UserEntity supportUser) {
        if (supportUser == null || employeeRepository.existsById(supportUser.getId())) return;
        employeeRepository.save(EmployeeEntity.builder().userEntity(supportUser)
                .employeeCode(CodeGenerator.generate("EP", employeeRepository::existsByEmployeeCode))
                .position("Nhân viên hỗ trợ").employmentTypeEnum(EmploymentTypeEnum.FULL_TIME)
                .startDate(java.time.LocalDateTime.now()).status(EmployeeStatusEnum.ACTIVE).build());
        log.info("Created EmployeeEntity for default SUPPORT user {}", supportUser.getEmail());
    }

    /**
     * Nếu DB đã có sẵn permission,
     * gán toàn bộ cho role ADMIN.
     * Nếu DB chưa có permission nào, bỏ qua.
     */
    private void assignExistingPermissionToAdmin(RoleEntity role) {
        List<PermissionEntity> allPermissions = permissionRepository.findAll();
        if (allPermissions.isEmpty()) {
            log.info("No Permission found in DB, skip");
            return;
        }

        Set<Long> existingPermissionIds = rolePermissionRepository.findByRoleEntity_Id(role.getId())
                .stream()
                .map(rp -> rp.getPermissionEntity().getId())
                .collect(Collectors.toSet());
        int assignedCount = 0;

        for (PermissionEntity permission : allPermissions) {
            if (!existingPermissionIds.contains(permission.getId())) {
                RolePermissionEntity rp = RolePermissionEntity.builder()
                        .roleEntity(role)
                        .permissionEntity(permission)
                        .build();
                rolePermissionRepository.save(rp);
                assignedCount++;
            }
        }

        if (assignedCount > 0) {
            log.info("Assigned {} permission(s) to role ADMIN.", assignedCount);
        } else {
            log.info("Role ADMIN already has all existing permissions.");
        }
    }
}
