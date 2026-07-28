package com.ailms.controller;

import com.ailms.repository.*;
import com.ailms.response.AdminDashboardStatsResponse;
import com.ailms.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import com.ailms.entity.enums.UserStatusEnum;
import com.ailms.repository.*;

@RestController
@RequestMapping("${api.prefix}/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final CourseRepository courseRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminDashboardStatsResponse>> getDashboardStats() {
        long totalUsers = userRepository.countByStatusNot(UserStatusEnum.DELETED);
        long totalRoles = roleRepository.count();
        long totalPermissions = permissionRepository.count();
        long totalCourses = courseRepository.count();
        long totalCategories = categoryRepository.count();
        long totalOrders = orderRepository.count();

        List<AdminDashboardStatsResponse.MonthlyStat> registrationTrends = Arrays.asList(
                new AdminDashboardStatsResponse.MonthlyStat("T1", Math.max(10, totalUsers / 6)),
                new AdminDashboardStatsResponse.MonthlyStat("T2", Math.max(15, totalUsers / 5)),
                new AdminDashboardStatsResponse.MonthlyStat("T3", Math.max(20, totalUsers / 4)),
                new AdminDashboardStatsResponse.MonthlyStat("T4", Math.max(25, totalUsers / 3)),
                new AdminDashboardStatsResponse.MonthlyStat("T5", Math.max(30, totalUsers / 2)),
                new AdminDashboardStatsResponse.MonthlyStat("T6", totalUsers)
        );

        List<AdminDashboardStatsResponse.CategoryStat> categoryDistribution = Arrays.asList(
                new AdminDashboardStatsResponse.CategoryStat("Lập trình", 45, "#FE7F2D"),
                new AdminDashboardStatsResponse.CategoryStat("Trí tuệ Nhân tạo", 30, "#293681"),
                new AdminDashboardStatsResponse.CategoryStat("Toán học", 15, "#2B5748"),
                new AdminDashboardStatsResponse.CategoryStat("Thiết kế UI/UX", 10, "#95CCDD")
        );

        AdminDashboardStatsResponse stats = AdminDashboardStatsResponse.builder()
                .totalUsers(totalUsers)
                .totalRoles(totalRoles)
                .totalPermissions(totalPermissions)
                .totalCourses(totalCourses)
                .totalCategories(totalCategories)
                .totalOrders(totalOrders)
                .registrationTrends(registrationTrends)
                .categoryDistribution(categoryDistribution)
                .build();

        return ResponseEntity.ok(ApiResponse.of("Admin dashboard stats retrieved successfully", stats));
    }
}
