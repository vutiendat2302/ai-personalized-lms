package com.ailms.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardStatsResponse {
    private long totalUsers;
    private long totalRoles;
    private long totalPermissions;
    private long totalCourses;
    private long totalCategories;
    private long totalOrders;

    private List<MonthlyStat> registrationTrends;
    private List<CategoryStat> categoryDistribution;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MonthlyStat {
        private String month;
        private long value;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CategoryStat {
        private String name;
        private long value;
        private String color;
    }
}
