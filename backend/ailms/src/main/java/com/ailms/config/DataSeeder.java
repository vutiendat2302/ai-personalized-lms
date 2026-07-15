package com.ailms.config;

import com.ailms.entity.*;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Seed dữ liệu mặc định khi ứng dụng khởi động.
 * Bao gồm:
 * - Role ADMIN (nếu chưa có)
 * - TK admin mặc định, đã gán role ADMIN (nếu chưa có)
 * - Gán hết Permission cho Role admin, nếu permission đã tồn tại trong db,
 * - Tạo tài khoản Admin mặc định.
 */

@Configuration
@RequiredArgsConstructor
@Slf4j
@Profile("seed")
public class DataSeeder {

    private static final String ADMIN_ROLE_NAME = "ADMIN";
    private static final String ADMIN_ROLE_CODE = "ADMIN";
    private static final String ADMIN_USERNAME = "admin123";
    private static final String ADMIN_EMAIL = "admin@gmail.com";
    private static final String ADMIN_DEFAULT_PASSWORD = "Password@123";

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    /** Khởi chạy quá trình seed dữ liệu khi ứng dụng khởi động. */
    @Bean
    CommandLineRunner seed() {
        return _ -> seedData();
    }

    /** Thực hiện khởi tạo toàn bộ dữ liệu mặc định. */
    public void seedData() {
        log.info("Starting database seeding...");

        RoleEntity adminRole = seedAdminRole();
        seedAdminUser(adminRole);
        assignExistingPermissionToAdmin(adminRole);

        log.info("Database seeding completed successfully.");
    }

//    Tao role admin neu chua ton tai
    private RoleEntity seedAdminRole() {
        Optional<RoleEntity> existing = roleRepository.findByName(ADMIN_ROLE_NAME);

        if (existing.isPresent()) {
            log.info("Role ADMIN already exists, skip");

            return existing.get();
        }

        RoleEntity role = RoleEntity.builder()
                .name(ADMIN_ROLE_NAME)
                .code(ADMIN_ROLE_CODE)
                .description("System Administrator")
                .isSystem(true)
                .build();
        role = roleRepository.save(role);
        log.info("Create role admin");
        return role;
    }

    private void seedAdminUser(RoleEntity adminRole) {
        if (userRepository.existsByEmail(ADMIN_EMAIL)) {
            log.info("Admin user already exists, skip");
            return;
        }

        UserEntity admin = new UserEntity();
        admin.setUsername(ADMIN_USERNAME);
        admin.setEmail(ADMIN_EMAIL);
        admin.setPasswordHash(passwordEncoder.encode(ADMIN_DEFAULT_PASSWORD));
        admin.setFullName("Default Administrator");
        admin.setStatus(UserStatusEnum.ACTIVE);
        admin = userRepository.save(admin);

        UserRoleEntity userRole = UserRoleEntity.builder()
                .userEntity(admin)
                .assignedBy(admin.getId())
                .roleEntity(adminRole)
                .build();
        userRoleRepository.save(userRole);

        log.info("Created default admin user {}", ADMIN_EMAIL);
    }

    /**
     * Nếu DB đã có sẵn permission,
     * gán toàn bộ cho role ADMIN.
     * Nếu DB chưa có permission nào, bỏ qua
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
