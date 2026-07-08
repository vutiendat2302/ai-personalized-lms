package com.ailms.config;

import com.ailms.entity.RoleEntity;
import com.ailms.entity.UserEntity;
import com.ailms.repository.RoleRepository;
import com.ailms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class DataSeederTest {

    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private DataSeeder dataSeeder;

    /**
     * Kiểm tra Role ADMIN và tài khoản Admin mặc định đã được tạo.
     */
    @Test
    void testSeededDataExists() {
        // Verify ADMIN role exists
        Optional<RoleEntity> adminRoleOpt = roleRepository.findByName("ADMIN");
        assertTrue(adminRoleOpt.isPresent(), "Role ADMIN should exist");
        assertTrue(adminRoleOpt.get().getIsSystem(), "Role ADMIN should be marked as system role");

        // Verify default admin user exists
        Optional<UserEntity> adminOpt = userRepository.findByEmail("admin@gmail.com");
        assertTrue(adminOpt.isPresent(), "Default admin user should exist");
        assertEquals("admin123", adminOpt.get().getUsername());
        assertEquals("Default Administrator", adminOpt.get().getFullName());
    }

    @Test
    void testSeedDataSecondTimeDoesNotDuplicate() {
        long initialRoleCount = roleRepository.count();
        long initialUserCount = userRepository.count();

        // Run seed data again
        dataSeeder.seedData();

        // Verify counts are the same, no duplicate created
        assertEquals(initialRoleCount, roleRepository.count(), "Role count should remain same");
        assertEquals(initialUserCount, userRepository.count(), "User count should remain same");
    }
}